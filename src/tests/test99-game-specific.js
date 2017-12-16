/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const TEST = chaiG.makeFailAndOK('user');

describe('=GAME= Specific User Actions', () => {
	TEST.SET_USER(() => testUsers.chamberlainpi);

	TEST.OK('get::/everything', 'GET EVERYTHING!', null, data => {
		assert.exists(data.user, 'user exists.');
		assert.exists(data.user.login, 'login exists.');
		assert.exists(data.user.login.token, 'token exists.');
		assert.exists(data.user.game, 'game exists.');
		assert.exists(data.user.game.currency, 'currency exists.');
		assert.exists(data.items, 'items exists.');
		assert.exists(data.heroes, 'heroes exists.');
		assert.exists(data.explorations, 'explorations exists.');
		assert.exists(data.user.game.boosts, 'boosts info exists.');
		assert.exists(data.user.game.boosts.currency, 'boosts.currency exists.');
		trace(data.user.game);
		assert.equal(data.items.length>0, true, 'Has some items.');
		assert.equal(data.heroes.length, 3, 'heroes matches..');
	});

	if(chaiG.filterLevel < 10) return;

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



	it('REMOVE EVERTHING!', done => {
		chamberlainpi.sendAuth('/user/everything/remove', 'delete')
			.then(data => {
				assert.exists(data, 'data exists.');
				assert.exists(data.user, 'user exists.');
				assert.exists(data.user.login, 'login exists.');
				assert.exists(data.user.login.token, 'token exists.');
				assert.exists(data.user.game, 'game exists.');
				assert.exists(data.user.game.currency, 'currency exists.');
				assert.exists(data.itemsRemoved, 'items exists.');
				assert.exists(data.heroesRemoved, 'heroes exists.');
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

