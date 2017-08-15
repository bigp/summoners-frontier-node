/**
 * Created by Chamberlain on 8/11/2017.
 */

module.exports = function(mongoose) {
	const Schema  = mongoose.Schema;
	const ERROR_MAXLENGTH= '`{PATH}` field must be {MAXLENGTH} chars, you used {VALUE}.';
	const String128 = {type: String, trim: true, maxlength: [128, ERROR_MAXLENGTH]};
	const String256 = {type: String, trim: true, maxlength: [256, ERROR_MAXLENGTH]};

	return {
		//plural: 'users',
		methods: {},

		schema: {
			name: String128,
			username: String128,
			email: String256
		}
	};
};

