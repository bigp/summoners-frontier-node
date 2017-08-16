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
		schema: {
			name: CustomTypes.String128({required:true}),
			username: CustomTypes.String128({required:true, unique: 'Already have a user with this username ({VALUE})'}),
			email: CustomTypes.String256({required:true, unique: 'Already have a user with this email ({VALUE})'}),
			timestamps: {
				loginLast: CustomTypes.DateRequired(),
				loginNow: CustomTypes.DateRequired(),
				created: CustomTypes.DateRequired()
			}
		}
	};
};

