/**
 * Created by Chamberlain on 8/11/2017.
 */

module.exports = function(mongoose) {
	const Schema  = mongoose.Schema;
	const CustomTypes  = mongoose.CustomTypes;

	return {
		plural: 'users',
		methods: {},
		whitelist: ['name', 'email', 'username'],
		blacklistVerbs: ["GET_MANY", "POST_ONE", "POST_MANY", "DELETE_ONE", "DELETE_MANY"],
		customRoutes: {
			add(Model, req, res, next, opts) {
				if(req.method!=='POST') {
					return $$$.send.error(res, "Can only use /add/user/ with 'POST' HTTP Verb.");
				}

				const methodUserAdd = Model.httpVerbs['POST_ONE'];
				methodUserAdd(req, res, next, opts);
			},

			login(Model, req, res, next, opts) {
				trace(opts);
				$$$.send.result(res, "OK");
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			name: CustomTypes.String128({required:true}),
			username: CustomTypes.String128({required:true, unique: 'Already have a user with this username ({VALUE})'}),
			email: CustomTypes.String256({required:true, unique: 'Already have a user with this email ({VALUE})'}),
			dateCreated: CustomTypes.DateRequired(),

			login: {
				dateLastAuth: CustomTypes.DateRequired(),
				dateNowAuth: CustomTypes.DateRequired(),
				datePing: CustomTypes.DateRequired(),
				token: CustomTypes.String128()
			}
		}
	};
};

