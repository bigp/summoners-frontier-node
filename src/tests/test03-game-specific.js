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

describe('=GAME= Specific User Actions', () => {
	it('Complete ActZone FAIL', done => {
		sendAPI('/user/completed-act-zone', 'post', {
			headers: {'Authorization': chaiG.userAuth},
			body: { fail: 1 }
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

	it('Complete ActZone OK', done => {
		sendAPI('/user/completed-act-zone', 'post', {
			headers: {'Authorization': chaiG.userAuth},
			body: { actZone: 1 }
		})
			.then(data => {
				assert.exists(data);
				done();
			})
			.catch(err => done(err));

	});

	it('Logout', done => {
		sendAPI('/user/logout', 'post', {
			headers: {'Authorization': chaiG.userAuth}
		})
			.then(data => {
				chaiG.padError(data.yellow);
				assert.exists(data);
				done();
			})
			.catch(err => done(err));

	});
});

