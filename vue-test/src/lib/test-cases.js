/**
 * Created by Chamberlain on 8/11/2017.
 */
module.exports = function() {
	var host = window.location.toString();
	host = host.substr(0, host.indexOf('/', 10));
	var api = host.replace(/:[0-9]+/, ':9000') + '/api';

	return {
		PUBLIC: {
			test() {
				return api + '/test';
			},
			'test-banned'() {
				return api + '/test-banned';
			}
		},
		SECURE: {
			'not-found'() {
				return api + '/not-found';
			},
			users() {
				return api + '/users';
			},
			user() {
				return api + '/user';
			},
			user_by_id() {
				return api + '/user?id=' + $$$.app.userID;
			},
			user_by_username() {
				return api + '/user?username=' + $$$.app.userID;
			},
			user_last() {
				return api + '/user/last';
			},
			user_pierre() {
				return api + '/user?name=Pierre';
			},
			user_post() {
				return {
					url: api + '/user',
					method: 'post',
					data: {
						user: {
							name: "John",
							username: 'john' + Date.now(),
							email: "john@gmail.com"
						}
					}
				}
			}
		}
	};
}