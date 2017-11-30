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
//const seedRandom = require('seedrandom');

module.exports = function() {
	var User, Item, Hero, Shop, LootCrate, Exploration;

	process.nextTick(() => {
		trace("In model-user.js:".magenta);
		traceProps($$$.models);

		User = $$$.models.User;
		Hero = $$$.models.Hero;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		LootCrate = $$$.models.Lootcrate;
		Exploration = $$$.models.Exploration;
	});

	return {
		plural: 'users',
		customRoutes: {
			'public/add'(Model, req, res, next, opts) {
				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'POST')) return;

					const g = gameHelpers.getJSONGlobals();
					const userData = opts.data;

					userData.username = userData.username.toLowerCase();
					userData._password = (userData._password || $$$.md5(userData.password)).toLowerCase();
					userData.game = {
						currency: {
							gold: g.GOLD,
							gems: g.GEMS,
							magicOrbs: g.MAGIC_ORBS,

							scrollsIdentify: g.SCROLLS_IDENTIFY,
							scrollsSummonCommon: g.SCROLLS_SUMMON_COMMON,
							scrollsSummonRare: g.SCROLLS_SUMMON_RARE,
							scrollsSummonMonsterFire: g.SCROLLS_SUMMON_MONSTER_FIRE,
							scrollsSummonMonsterWater: g.SCROLLS_SUMMON_MONSTER_WATER,
							scrollsSummonMonsterWind: g.SCROLLS_SUMMON_MONSTER_WIND,
							scrollsSummonMonsterLight: g.SCROLLS_SUMMON_MONSTER_LIGHT,
							scrollsSummonMonsterDark: g.SCROLLS_SUMMON_MONSTER_DARK,

							shardsItemsCommon: g.SHARDS_ITEMS_COMMON,
							shardsItemsMagic: g.SHARDS_ITEMS_MAGIC,
							shardsItemsRare: g.SHARDS_ITEMS_RARE,
							shardsItemsUnique: g.SHARDS_ITEMS_UNIQUE,

							shardsXPCommon: g.SHARDS_XP_COMMON,
							shardsXPMagic: g.SHARDS_XP_MAGIC,
							shardsXPRare: g.SHARDS_XP_RARE,
							shardsXPUnique: g.SHARDS_XP_UNIQUE,

							essenceLow: g.ESSENCE_LOW,
							essenceMid: g.ESSENCE_MID,
							essenceHigh: g.ESSENCE_HIGH,

							relicsSword: g.RELIC_SWORD,
							relicsShield: g.RELIC_SHIELD,
							relicsStaff: g.RELIC_STAFF,
							relicsBow: g.RELIC_BOW,
						}
					};

					const user = new User();
					_.extend(user, userData);
					return user.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
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
						var results = _.merge({
							gitInfo: {
								long: $$$.gitInfo.long,
								branch: $$$.gitInfo.branch,
								date: $$$.gitInfo.date
							}
						}, user.toJSON());

						//var results = _.assign({mongoID: user._id+''}, user.toJSON());
						mgHelpers.sendFilteredResult(res, results);
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

			// TODO:
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

				//user, user.game.currency
				user.updateCurrency(req, res, next, opts.data);
			},

			'everything$'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const q = {userId: user.id};
				const results = {user: user};

				Promise.all([
					Item.find(q).sort('id').exec(),
					Hero.find(q).sort('id').exec(),
					LootCrate.find(q).sort('id').exec(),
					Exploration.find(q).sort('id').exec(),
				])
				.then( belongings  => {
					results.items = belongings[0];
					results.heroes = belongings[1];
					results.lootCrates = belongings[2];
					results.explorations = belongings[3];
					results.jsonLoader = {dateLoaded: $$$.jsonLoader.dateLoaded};

					mgHelpers.sendFilteredResult(res, results);
				})
					.catch(err => {
						$$$.send.error(res, err);
					})
			},

			'everything/remove'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const q = {userId: user.id};
				const results = {user: user};

				mgHelpers.prepareRemoveRequest(req)
					.then(q => {
						return Promise.all([
							Item.remove(q),
							Hero.remove(q),
							LootCrate.remove(q),
							Exploration.remove(q)
						]);
					})
					.then( removals => {
						results.itemsRemoved = removals[0].toJSON().n;
						results.heroesRemoved = removals[1].toJSON().n;
						results.lootCratesRemoved = removals[2].toJSON().n;
						results.explorationsRemoved = removals[3].toJSON().n;

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'xp/'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;
					if(isNaN(opts.data.xp)) throw 'Missing "xp" field in POST data.';

					user.game.xp = opts.data.xp | 0;
					return user.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch( err => {
						$$$.send.error(res, err);
					})
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
			},

			updateCurrency(req, res, next, incoming, isReturned) {
				const currency = this.game.currency;

				switch(req.method) {
					case 'GET':
						if(isReturned) return currency;
						return mgHelpers.sendFilteredResult(res, currency);
					case 'PUT':
						_.traverse(currency, incoming, (err, match) => {
							if(err) throw err;

							const key = match.key;
							match.dest[key] += match.src[key];
							if(match.dest[key] < 0) {
								match.dest[key] = 0;
							}
						});
						break;
					default:
						return $$$.send.notImplemented(res);
				}

				this.save()
					.then(() => {
						if(isReturned) return currency;
						mgHelpers.sendFilteredResult(res, currency);
					})
					.catch(err => {throw err;});
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			name: CustomTypes.String128({required:true}),
			username: CustomTypes.String128({required:true, unique: 'Already have a user with this username ({VALUE})'}),
			email: CustomTypes.String128({required:true, unique: 'Already have a user with this email ({VALUE})'}),
			_password: CustomTypes.String128({required:true}),
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
				xp: CustomTypes.LargeInt({default: 0}),
				name: CustomTypes.String128({required:false}),

				/**
				 * TODO: For Messages, have the users "belong" to certain destination-groups.
				 *
				 * Examples:
				 *  - By demographics (?),
 				 */
				destinationGroupIDs: [CustomTypes.Int()],

				actsZones: {
					completed: CustomTypes.Int(),
				},

				currency: {
					gold: CustomTypes.Int(),
					gems: CustomTypes.Int(),
					magicOrbs: CustomTypes.Int(),

					scrollsIdentify: CustomTypes.Int(),
					scrollsSummonCommon: CustomTypes.Int(),
					scrollsSummonRare: CustomTypes.Int(),
					scrollsSummonMonsterFire: CustomTypes.Int(),
					scrollsSummonMonsterWater: CustomTypes.Int(),
					scrollsSummonMonsterWind: CustomTypes.Int(),
					scrollsSummonMonsterLight: CustomTypes.Int(),
					scrollsSummonMonsterDark: CustomTypes.Int(),

					shardsItemsCommon: CustomTypes.LargeInt(),
					shardsItemsMagic: CustomTypes.LargeInt(),
					shardsItemsRare: CustomTypes.LargeInt(),
					shardsItemsUnique: CustomTypes.LargeInt(),

					shardsXPCommon: CustomTypes.LargeInt(),
					shardsXPMagic: CustomTypes.LargeInt(),
					shardsXPRare: CustomTypes.LargeInt(),
					shardsXPUnique: CustomTypes.LargeInt(),

					essenceLow: CustomTypes.LargeInt(),
					essenceMid: CustomTypes.LargeInt(),
					essenceHigh: CustomTypes.LargeInt(),

					relicsSword: CustomTypes.LargeInt(),
					relicsShield: CustomTypes.LargeInt(),
					relicsStaff: CustomTypes.LargeInt(),
					relicsBow: CustomTypes.LargeInt(),
				},

				shopInfo: {
					//TODO: FEATURE!!! We could have the players purchase EXTRA shop-slots to see more items per refresh-keys.
					expansionSlots: CustomTypes.Int({default:0}),

					dateLastPurchasedFeaturedItem: CustomTypes.DateRequired({required: false, default: new Date(0)}),
					refreshKey: {
						purchased: [CustomTypes.Int()],
						seed: CustomTypes.LargeInt({min: -1, default: -1}),
						_dateGenerated: CustomTypes.DateRequired({required: false, default: new Date(0)}),
					}
				}
			}
		}
	};
};