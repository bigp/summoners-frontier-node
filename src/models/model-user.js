/**
 * Created by Chamberlain on 8/11/2017.
 */

const gameHelpers = require('../sv-json-helpers');
const nodemailer = require('../sv-setup-nodemailer');
const mgHelpers = require('../sv-mongo-helpers');
const request = require('request-promise');
const mongoose = mgHelpers.mongoose;
const CONFIG = $$$.env.ini;
const PRIVATE = CONFIG.PRIVATE;
const Schema  = mongoose.Schema;
const CustomTypes  = mongoose.CustomTypes;

module.exports = function() {
	return {
		plural: 'users',
		whitelist: ['name', 'email', 'username'],
		blacklistVerbs: "GET_ONE GET_MANY POST_ONE POST_MANY DELETE_ONE DELETE_MANY".split(' '),

		customRoutes: {
			'public/add'(Model, req, res, next, opts) {
				if(req.method!=='POST') {
					return $$$.send.error(res, "Can only use /user/add/ with 'POST' HTTP Verb.");
				}

				const jsonGlobals = gameHelpers.getJSONGlobals();
				const userData = opts.data;
				userData.username = userData.username.toLowerCase();
				userData._password = (userData._password || $$$.md5(userData.password)).toLowerCase();
				userData.game = {
					currency: {
						gold: jsonGlobals.DEFAULT_GOLD,
						gems: jsonGlobals.DEFAULT_GEMS,
						scrolls: jsonGlobals.DEFAULT_SCROLLS,
						magicOrbs: jsonGlobals.DEFAULT_MAGIC,
					}
				};

				Model.httpVerbs['POST_ONE'](req, res, next, opts);
			},

			'public/login'(Model, req, res, next, opts) {
				const data = opts.data;
				opts.data.username = (opts.data.username || '').toLowerCase();
				opts.data.email = (opts.data.email || '').toLowerCase();
				const password = (opts.data._password || $$$.md5(opts.data.password)).toLowerCase();
				const missingFields = [];
				const LOGIN_FAILED = 'LOGIN FAILED';

				if(!password) {
					missingFields.push('password');
				}
				if(!opts.data.username && !opts.data.email) {
					missingFields.push('username/email');
				}

				if(missingFields.length>0) {
					return $$$.send.errorCustom(res, 'Missing fields: ' + missingFields.join(', '), LOGIN_FAILED)
				}

				const orQuery = mgHelpers.getORsQuery(opts.data, ['username', 'email']);
				const andQuery = _.extend(orQuery, {_password: password});

				Model.findOne(andQuery).exec()
					.then(user => {
						if(!user) {
							traceError(password);
							throw "Incorrect Username and Password!";
						}

						//Always clear the password-reset on successful logins:
						user._passwordResetGUID = '';

						user.updateLoginDetails({ping:1, login:1, token:1});

						return user.save();
					})
					.then(user => {
						//var results = _.assign({mongoID: user._id+''}, user.toJSON());
						mgHelpers.sendFilteredResult(res, user);
					})
					.catch(err => {
						trace(err);
						$$$.send.errorCustom(res, err, LOGIN_FAILED);
					});
			},

			'public/forget-password'(Model, req, res, next, opts) {
				const q = {username: opts.data.username};

				Model.findOne(q).exec()
					.then(found => {
						if(!found) throw 'User not found!';
						found._passwordResetGUID = req.auth.pwdResetGUID = _.guid();

						return nodemailer.sendEmail(found.email, "ERDS - Password Reset", "GUID: " + found._passwordResetGUID)
					})
					.then( emailInfo => {
						if(!emailInfo) throw 'Email could not be sent!';

						if(emailInfo.isEmailDisabled && opts.data.direct) {
							emailInfo.guid = req.auth.pwdResetGUID;
						}

						$$$.send.result(res, emailInfo);
					})
					.catch(err => {
						$$$.send.errorCustom(res, err, "PASSWORD-RESET FAILED");
					})

			},

			// 'password-reset'(Model, req, res, next, opts) {
			//
			// },
			//
			// 'password-reset-sent'(Model, req, res, next, opts) {
			//
			// }

			'logout'(Model, req, res, next, opts) {
				const user = req.auth.user;

				//Clear the current fields:
				user.login.token = ''; //Clear the token
				user.login.datePing = $$$.nullDate();

				user.save()
					.then(() => {
						$$$.send.result(res, {logout: true});
					});
			},

			'test-echo'(Model, req, res, next, opts) {
				const user = req.auth.user;
				$$$.send.result(res, _.extend({name: user.name, username: user.username}, opts.data));
			},

			//////////////////////////////////////////////////////////////

			'game'(Model, req, res, next, opts) {
				const user = req.auth.user;
				if(mgHelpers.isWrongVerb(req, "GET")) return;

				mgHelpers.sendFilteredResult(res, user.game);
			},

			'completed-act-zone'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const actZone = opts.data.actZone;

				if(isNaN(actZone)) return $$$.send.error(res, "Missing actZone.");

				user.game.actsZones.completed = actZone;
				user.save()
					.then( updated => {
						mgHelpers.sendFilteredResult(res, updated.game.actsZones);
					});
			},

			'currency'(Model, req, res, next, opts) {
				const user = req.auth.user;

				if(!user) throw 'Missing user!';

				const incoming = opts.data;
				const currency = user.game.currency;

				var updated = true;

				switch(req.method) {
					case 'GET':
						updated = false;
						return mgHelpers.sendFilteredResult(res, currency);
					case 'PUT':
						_.keys(incoming).forEach(coinType => {
							if(_.isNull(currency[coinType])) return;
							currency[coinType] += incoming[coinType];
						});
						break;
					default:
						return $$$.send.notImplemented(res);
				}

				if(updated) {
					user.save()
						.then(() => {
							mgHelpers.sendFilteredResult(res, currency);
						})
						.catch(err => {throw err;});


				} else next();
			},

			'everything'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const Item = $$$.models.Item;
				const Hero = $$$.models.Hero;
				const q = {userId: user.id};
				const results = {user: user};

				Promise.all([
					Item.find(q).sort('id').exec(),
					Hero.find(q).sort('id').exec()
				])
					.then( belongings  => {
						results.items = belongings[0];
						results.heroes = belongings[1];
						mgHelpers.sendFilteredResult(res, results);
					});
			}
		},

		methods: {
			updateLoginDetails(which) {
				const login = this.login;
				const now = new Date();
				if(which.ping) login.datePing = now;
				if(which.login) {
					login.dateLast = login.dateNow;
					login.dateNow = now;
				}
				if(which.token) {
					login.tokenLast = this.token;
					login.token = this.createToken();
				}
			},

			createToken() {
				const shortMD5 = s => $$$.md5(s).substr(0, 16);
				//This could literally be any mixture of GUID + blablabla ... generate a nice long hash!
				return $$$.encodeToken(_.guid(), shortMD5(this.username), shortMD5(this.email));
			},

			sendLogin() {
				return $$$.send.api('/user/public/login', 'post', {
					body: {
						username: this.username,
						_password: this._password,
					}
				}).then( data => {
					this.login.token = data.login.token;
					return data;
				});
			},

			sendAuth(url, method, options) {
				if(!options) options = {};
				if(options==='*') {
					options = {
						body: {
							name: this.name,
							username: this.username,
							email: this.email,
							_password: this._password,
						}
					}
				}

				if(!options.headers) {
					options.headers = { 'Authorization': this.getAuthorizationString() };
				}

				return $$$.send.api(url, method, options);
			},

			getAuthorizationString() {
				return this.login.token ?
					$$$.encodeToken(PRIVATE.AUTH_CODE, this.username, this.login.token) :
					$$$.encodeToken(PRIVATE.AUTH_CODE);
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			name: CustomTypes.String128({required:true}),
			username: CustomTypes.String128({required:true, unique: 'Already have a user with this username ({VALUE})'}),
			email: CustomTypes.String128({required:true, unique: 'Already have a user with this email ({VALUE})'}),
			_password: CustomTypes.String32({required:true}),
			_passwordResetGUID: CustomTypes.String128(),

			dateCreated: CustomTypes.DateRequired(),

			login: {
				dateLast: CustomTypes.DateRequired(),
				dateNow: CustomTypes.DateRequired(),
				datePing: CustomTypes.DateRequired(),
				token: CustomTypes.String128(),
				tokenLast: CustomTypes.String128(),
			},

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				level: {
					current: CustomTypes.Int({default: 1}),
					progress: CustomTypes.Number({default: 0})
				},
				actsZones: {
					completed: CustomTypes.Int(),
				},

				currency: {
					gold: CustomTypes.Int(),
					gems: CustomTypes.Int(),
					scrolls: CustomTypes.Int(),
					magicOrbs: CustomTypes.Int(),
				},
			}

		}
	};
};