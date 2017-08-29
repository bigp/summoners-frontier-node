/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const sendAPI = chaiG.sendAPI;
const TestUsers = chaiG.TestUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;

describe('=REST= User-Restricted actions', () => {

	var userToAdd = chaiG.userToAdd;

	it('Login User (with a slight delay to modify PING timestamp)', done => {
		setTimeout(
			() => {
				sendAPI('/user/login', 'post', {
					body: {
						username: userToAdd.username,
						_password: $$$.md5(userToAdd.password),
					}
				})
					.then(data => {
						chaiG.userLogged = data;
						chaiG.userAuth = $$$.encodeToken(PRIVATE.AUTH_CODE, data.username, data.login.token);

						userToAdd = chaiG.userToAdd = _.extend({}, chaiG.userToAdd, data);

						assert.exists(data);
						done();
					})
					.catch(err => {
						done(err);
					});
			}, 250
		)
	});

	it('Test User-Restricted call [FAIL EMPTY]', done => {
		sendAPI('/user/test-echo', 'post', {headers:{Authorization:'???'}})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});

	});

	it('Test User-Restricted call [FAIL MISSING username & token]', done => {
		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': $$$.encodeToken(PRIVATE.AUTH_CODE)},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});

	});

	it('Test User-Restricted call [FAIL BAD username]', done => {
		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': $$$.encodeToken(PRIVATE.AUTH_CODE, "???", "???")},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});

	});

	it('Test User-Restricted call [FAIL Logged Out]', done => {
		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': $$$.encodeToken(PRIVATE.AUTH_CODE, "peter", chaiG.userLogged.token)},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});
	});

	it('Test User-Restricted call [FAIL BAD token]', done => {
		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': $$$.encodeToken(PRIVATE.AUTH_CODE, chaiG.userLogged.username, "???")},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});

	});

	it('Test User-Restricted call', done => {
		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': chaiG.userAuth},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.exists(data);
				assert(data.foo, 'bar', 'Still got {foo:bar} back?');
				done();
			})
			.catch(err => {
				done(err);
			});

	});

	it('Test Password Reset', done => {
		sendAPI('/user/forget-password', 'post', {
			headers: {'Authorization': chaiG.userAuth},
			body: { username: chaiG.userLogged.username, direct:1 }
		})
			.then(data => {
				chaiG.showTraces && trace(data);
				assert.exists(data);
				done();
			})
			.catch(err => {
				done(err);
			});

	});

});
