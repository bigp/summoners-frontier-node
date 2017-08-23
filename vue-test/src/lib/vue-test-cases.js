/**
 * Created by Chamberlain on 8/11/2017.
 */
module.exports = function() {
	const hostStr = window.location.toString();
	const host = hostStr.substr(0, hostStr.indexOf('/', 10));
	const api = host.replace(/:[0-9]+/, ':9999') + '/api';

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
			'test-post'() {
				return {
					url: api + '/test-post',
					method: 'post',
					data: {
						test: {
							message: 'Hello World!'
						}
					}
				}
			},
			users() {
				return api + '/users';
			},
			user() {
				return api + '/user';
			},
			user_by_id() {
				return api + '/user?id=' + $$$.app.user.id;
			},
			user_by_username() {
				return api + '/user?username=' + $$$.app.user.username;
			},
			user_last() {
				return api + '/user/last';
			},
			user_pierre() {
				return api + '/user?name=Pierre';
			},
			user_post() {
				const user = $$$.app.user;
				return {
					url: api + '/user',
					method: 'post',
					data: {
						user: {
							name: user.name,
							username: user.username,
							email: user.email
						}
					}
				}
			},
			user_what() {
				return "";
			}
		}
	};
}