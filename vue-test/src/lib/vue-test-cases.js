/**
 * Created by Chamberlain on 8/11/2017.
 */

module.exports = function() {
	const hostStr = window.location.toString();
	const host = hostStr.substr(0, hostStr.indexOf('/', 10));
	const api = host.replace(/:[0-9]+/, ':'+ENV.PORT) + '/api';

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
			'test-echo'() {
				return {
					url: api + '/test-echo',
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
			user_add() {
				const user = $$$.app.user;
				return {
					url: api + '/user/add',
					method: 'post',
					data: {
						name: user.name,
						email: user.email,
						username: user.username,
						password: user.password,
					}
				}
			},
			user_login() {
				const user = $$$.app.user;
				return {
					url: api + '/user/login',
					method: 'post',
					data: {
						name: user.name,
						email: user.email,
						username: user.username,
						password: user.password,
					}
				};
			},
			user_forget_password() {
				const user = $$$.app.user;
				return {
					url: api + '/user/forget-password',
					method: 'post',
					data: {
						name: user.name,
						email: user.email,
						username: user.username,
						password: user.password,
					}
				};
			}
		}
	};
}