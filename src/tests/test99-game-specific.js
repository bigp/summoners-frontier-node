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
const sendAPIAuth = chaiG.sendAPIAuth;


describe('=GAME= Specific User Actions', () => {
	var chamberlainpi;

	it('Complete ActZone FAIL', done => {
		chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendAuth('/user/completed-act-zone', 'post', {
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
		chamberlainpi.sendAuth('/user/completed-act-zone', 'post', {
			body: { actZone: 1 }
		})
			.then(data => {
				assert.exists(data);
				done();
			})
			.catch(err => done(err));

	});

	it('GET EVERYTHING!', done => {
		chamberlainpi.sendAuth('/user/everything', 'get')
			.then(data => {
				assert.exists(data);
				assert.exists(data.user);
				assert.exists(data.user.login);
				assert.exists(data.user.login.token);
				assert.exists(data.user.game);
				assert.exists(data.user.game.currency);
				assert.exists(data.items);
				assert.exists(data.items[0]);
				assert.exists(data.heroes);
				assert.exists(data.heroes[0]);
				done();
			})
			.catch(err => done(err));

	});

	it('Logout', done => {
		chamberlainpi.sendAuth('/user/logout', 'post')
			.then(data => {
				chaiG.padError(data.yellow);
				assert.exists(data);
				done();
			})
			.catch(err => done(err));
	});
});

