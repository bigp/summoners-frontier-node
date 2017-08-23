/**
 * Created by Chamberlain on 8/11/2017.
 */

const mgHelpers = require('../sv-mongo-helpers');

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
				opts.data._password = opts.data._password || $$$.md5(opts.data.password);

				const methodUserAdd = Model.httpVerbs['POST_ONE'];
				methodUserAdd(req, res, next, opts);
			},

			login(Model, req, res, next, opts) {
				const data = opts.data;
				opts.data.username = (opts.data.username || '').toLowerCase();
				opts.data.email = (opts.data.email || '').toLowerCase();

				const orQuery = mgHelpers.getORsQuery(opts.data, ['username', 'email']);
				const andQuery = {
					$and: [
						{_password: opts.data._password || $$$.md5(opts.data.password)},
						orQuery
					]
				};

				Model.findOne(andQuery).exec()
					.then(user => {
						if(!user) throw "";

						user.updateLoginDetails({ping:1, login:1, token:1});

						return user.save();
					})
					.then(user => {
						mgHelpers.sendFilteredResult(res, user);
					})
					.catch(err => {
						trace(err);
						$$$.send.error(res, "Login Failed.");
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
					login.token = this.createToken();
					trace(login.token);
				}
			},

			createToken() {
				return [_.guid(), this.username, this.email].join('::').toBase64();
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			name: CustomTypes.String128({required:true}),
			username: CustomTypes.String128({required:true, unique: 'Already have a user with this username ({VALUE})'}),
			email: CustomTypes.String256({required:true, unique: 'Already have a user with this email ({VALUE})'}),
			_password: CustomTypes.String32({required:true}),

			dateCreated: CustomTypes.DateRequired(),

			login: {
				dateLast: CustomTypes.DateRequired(),
				dateNow: CustomTypes.DateRequired(),
				datePing: CustomTypes.DateRequired(),
				token: CustomTypes.String128()
			}
		}
	};
};

