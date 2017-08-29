/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;

describe('=REST= User', () => {

	it('Test-Post (Hello World test)', done => {

		sendAPI('/test-echo', 'post', {
			body: {
				name: 'Jon',
				username: 'Jon123',
				email: 'jon@gmail.com',
				_password: 'pi3rr3',
			}
		})
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.exists(data.echo);
				assert.equal(data.echo.name, 'Jon', 'Name is correct');
				done();
			})
			.catch(catcher(done));
	});

	it('Get User (first)', done => {
		sendAPI('/user')
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.equal(data.name, 'Pierre', 'name is correct');

				done();
			})
			.catch(catcher(done));
	});

	it('Get User (last)', done => {
		sendAPI('/user/last')
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.equal(data.name, 'Peter', 'name is correct');
				assert.equal(data.email, 'peter@gmail.com', 'email is correct');

				done();
			})
			.catch(catcher(done));
	});

	it('Get Users (ALL)', done => {
		sendAPI('/users')
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.equal(data.length, 3, 'data.length correct?');
				assert.equal(data[0].name, 'Pierre', 'Still Pierre');
				assert.equal(data[1].name, 'Pierre', 'Still Pierre');
				assert.equal(data[2].name, 'Peter', 'Still Peter');
				done();
			})
			.catch(catcher(done));
	});

	it('Get Users (Pierre)', done => {
		sendAPI('/users?name=Pierre')
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.equal(data.length, 2, 'Has 2 entries');
				done();
			})
			.catch(catcher(done));
	});

	it('Get User (Peter by email)', done => {
		sendAPI('/user?email=peter@gmail.com')
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.equal(data.name, 'Peter', 'Should be Peter');
				assert.equal(data.email, 'peter@gmail.com', 'Should be Peter\'s email');

				done();
			});
	});

	it('Get User (FAIL by unknown prop)', done => {
		sendAPI('/user?foo=bar')
			.then(data => {
				assert.notExists(data);
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	var newUser;

	it('Add User', done => {
		sendAPI('/user', 'post', {
			body: {
				name: 'Jon',
				username: 'Jon123',
				email: 'jon@gmail.com',
				_password: 'pi3rr3',
			}
		})
			.then(data => {
				assert.exists(data, 'JSON data added.');
				assert.equal(data.name, 'Jon', 'name is correct');
				assert.equal(data.username, 'Jon123', 'username is correct');

				newUser = data;

				done();
			})
			.catch(catcher(done));
	});

	it('Remove User (Try FAIL)', done => {
		sendAPI('/user?_id=123', 'delete')
			.then(data => {
				assert.notExists(data);
				assert.equal(data.n, 0, 'Should have removed 0 entry.');
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Remove User (Try OK)', done => {
		sendAPI('/user?id=' + newUser.id, 'delete')
			.then(data => {
				assert.exists(data);
				assert.equal(data.n, 1, 'Should have removed 1 entry.');
				assert.equal(data.ok, 1, 'Should be ok.');
				done();
			})
			.catch(catcher(done));
	});

	it('Get Users Count', done => {
		sendAPI('/users/count')
			.then(data => {
				assert.exists(data);
				assert.equal(data.count, 3, "Get correct count.");
				done();
			})
			.catch(catcher(done));
	});

	it("Update User (TestUsers.pierre's email)", done => {
		sendAPI('/user?id=' + testUsers.pierre.id, 'put', {
			body: {email: "changed@gmail.com"}
		})
			.then(data => {
				assert.exists(data);
				assert.equal(data.name, testUsers.pierre.name, 'Same name');
				assert.notEqual(data.email, testUsers.pierre.email, 'Different emails');

				done();
			})
			.catch(catcher(done));
	});

	it('Add User (FAIL with same name)', done => {
		sendAPI('/user', 'post', {
			body: {
				name: 'Jon',
				username: 'Jon123',
				email: 'old-jon@gmail.com',
				_password: 'pi3rr3',
			}
		})
			.then(data => {
				assert.exists(data, 'JSON data added.');
				assert.equal(data.name, 'Jon', 'name is correct');
				assert.equal(data.username, 'Jon123', 'username is correct');

				newUser = data;

				done();
			})
			.catch(catcher(done));
	});

	it('Add User (FAIL with id)', done => {
		sendAPI('/user', 'post', {
			body: {
				id: 1,
				name: 'Jon',
				username: 'Jon123',
				email: 'new-jon@gmail.com',
				_password: 'pi3rr3',
			}
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				assert.exists(err);
				assert.equal(err.message.has('illegal'), true, 'Contains the word "illegal".');
				done();
			});
	});

	it('Add User (FAIL with duplicate)', done => {
		sendAPI('/user', 'post', {
			body: {
				name: 'Jon',
				username: 'Jon123',
				email: 'new-jon@gmail.com',
				_password: 'pi3rr3',
			}
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Get Users (ALL)', done => {
		sendAPI('/users')
			.then(data => {
				done();
			})
			.catch(catcher(done));
	});

	it('Add User (/user/add/)', done => {
		chaiG.makeTestUsers();

		const chamberlainpi = chaiG.testUsers.chamberlainpi;

		sendAPI('/user/add', 'post', {
			body: {
				name: chamberlainpi.name,
				username: chamberlainpi.username,
				email: chamberlainpi.email,
				_password: chamberlainpi._password,
			}
		})
			.then(data => {
				_.extend(chaiG.testUsers.chamberlainpi, data);
				assert.exists(data);
				done();
			})
			.catch(err => {
				done(err);
			});
	});
});