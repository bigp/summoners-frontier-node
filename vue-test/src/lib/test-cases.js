/**
 * Created by Chamberlain on 8/11/2017.
 */
module.exports = function() {
	var host = window.location.toString();
	host = host.substr(0, host.indexOf('/', 10));
	var api = host.replace(/[0-9]+/, '9000') + '/api';

	return {
		PUBLIC: {
			test() {
				return api + '/test';
			},
			'test-banned'() {
				return api + '/test-banned';
			},
			'unsec-user'() {
				return api + '/unsec-user';
			}
		},
		SECURE: {
			'not-found'() {
				return api + '/not_found';
			},
			users() {
				return api + '/users';
			},
			user() {
				return api + '/user';
			},
		}
	};
}