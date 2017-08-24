/**
 * Created by Chamberlain on 8/11/2017.
 */

const nodemailer = require('../sv-setup-nodemailer');
const mgHelpers = require('../sv-mongo-helpers');
const CONFIG = $$$.env.ini;

module.exports = function(mongoose) {
	const Schema  = mongoose.Schema;
	const CustomTypes  = mongoose.CustomTypes;

	return {
		plural: 'users',
		whitelist: ['name', 'email', 'username'],
		blacklistVerbs: ["GET_MANY", "POST_ONE", "POST_MANY", "DELETE_ONE", "DELETE_MANY"],

		customRoutes: {
			add(Model, req, res, next, opts) {
				if(req.method!=='POST') {
					return $$$.send.error(res, "Can only use /add/user/ with 'POST' HTTP Verb.");
				}

				const data = opts.data;
				opts.data.username = opts.data.username.toLowerCase();
				opts.data._password = (opts.data._password || $$$.md5(opts.data.password)).toLowerCase();

				const methodUserAdd = Model.httpVerbs['POST_ONE'];
				methodUserAdd(req, res, next, opts);
			},

			login(Model, req, res, next, opts) {
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
							throw "Incorrect Username and Password: " + _.jsonPretty(andQuery);
						}

						//Always clear the password-reset on successful logins:
						user._passwordResetGUID = '';

						user.updateLoginDetails({ping:1, login:1, token:1});

						return user.save();
					})
					.then(user => {
						mgHelpers.sendFilteredResult(res, user);
					})
					.catch(err => {
						trace(err);
						$$$.send.errorCustom(res, err, LOGIN_FAILED);
					});

			},

			'test-echo'(Model, req, res, next, opts) {
				mgHelpers.authenticateUser(req, res, next)
					.then( data => {
						$$$.send.result(res, opts.data);
					})
					.catch( err => {
						$$$.send.errorCustom(res, err, "User Authentication Failed");
					});
			},

			'request-password-reset'(Model, req, res, next, opts) {
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
		},

		///////////////////////////////////////////////////////////

		schema: {
			name: CustomTypes.String128({required:true}),
			username: CustomTypes.String128({required:true, unique: 'Already have a user with this username ({VALUE})'}),
			email: CustomTypes.String256({required:true, unique: 'Already have a user with this email ({VALUE})'}),
			_password: CustomTypes.String32({required:true}),
			_passwordResetGUID: CustomTypes.String128(),

			dateCreated: CustomTypes.DateRequired(),

			login: {
				dateLast: CustomTypes.DateRequired(),
				dateNow: CustomTypes.DateRequired(),
				datePing: CustomTypes.DateRequired(),
				token: CustomTypes.String128(),
				tokenLast: CustomTypes.String128(),
			}
		}
	};
};