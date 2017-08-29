/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const TestUsers = chaiG.TestUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;
const sendAPIAuth = chaiG.sendAPIAuth;


describe('=GAME= Specific User Actions', () => {
	it('Complete ActZone FAIL', done => {
		sendAPIAuth('/user/completed-act-zone', 'post', {
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
		sendAPIAuth('/user/completed-act-zone', 'post', {
			body: { actZone: 1 }
		})
			.then(data => {
				assert.exists(data);
				done();
			})
			.catch(err => done(err));

	});

	it('Logout', done => {
		sendAPIAuth('/user/logout', 'post')
			.then(data => {
				chaiG.padError(data.yellow);
				assert.exists(data);
				done();
			})
			.catch(err => done(err));

	});
});

