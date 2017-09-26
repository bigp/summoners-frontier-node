/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');
const mgHelpers = require('../sv-mongo-helpers');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;

describe('=REST= User', () => {
	var chamberlainpi;

	it('Test-Post (Hello World test)', done => {
		chaiG.makeTestUsers();

		sendAPI('/test-echo', 'post', { body: {hello: "world"} })
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.exists(data.echo);
				assert.equal(data.echo.hello, 'world', 'echo is correct');
				done();
			})
			.catch(catcher(done));
	});

	it('Get Users (ALL)', done => {
		sendAPI('/admin/users')
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.equal(data.length, 2, 'data.length correct?');
				assert.equal(data[0].name, 'Pierre', 'Still Pierre');
				assert.equal(data[1].name, 'Peter', 'Still Peter');
				done();
			})
			.catch(catcher(done));
	});

	it('Add User (/user/public/add/)', done => {
		chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendAuth('/user/public/add', 'post', "*")
			.then(data => {
				_.extend(testUsers.chamberlainpi, data);
				assert.exists(data);

				setTimeout(done, 50);
			})
			.catch(err => {
				done(err);
			});
	});

	it('Login User (with a slight delay to modify PING timestamp)', done => {
		const chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendLogin()
			.then(data => {
				assert.exists(data);
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	if(chaiG.filterLevel < 2) return;

	it('Check Currency (/user/currency/)', done => {
		const chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendAuth('/user/currency', 'get')
			.then(data => {
				assert.exists(data);
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('Add Currency (/user/currency/)', done => {
		const chamberlainpi = testUsers.chamberlainpi;
		const currencyBefore = chamberlainpi.game.currency;

		chamberlainpi.sendAuth('/user/currency', 'put', {
			body: {
				gold:1, gems:1, magicOrbs: 1, scrolls: {identify: 1, summonHero: 1},
			}
		})
			.then(data => {
				assert.equal(data.gold, currencyBefore.gold+1, "gold + 1");
				assert.equal(data.gems, currencyBefore.gems+1, "gems + 1");
				assert.equal(data.magicOrbs, currencyBefore.magicOrbs+1, "magicOrbs + 1");
				assert.equal(data.scrolls.identify, currencyBefore.scrolls.identify+1, "scrolls + 1");
				assert.equal(data.scrolls.summonHero, currencyBefore.scrolls.summonHero+1, "scrolls + 1");
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('Remove Currency (/user/currency/)', done => {
		const chamberlainpi = testUsers.chamberlainpi;
		const currencyBefore = chamberlainpi.game.currency;

		chamberlainpi.sendAuth('/user/currency', 'put', {
			body: {
				gold:-1, gems:-1, magicOrbs: -1, scrolls: {identify: -1, summonHero: -1},
			}
		})
			.then(data => {
				assert.equal(data.gold, currencyBefore.gold, "gold - 1");
				assert.equal(data.gems, currencyBefore.gems, "gems - 1");
				assert.equal(data.magicOrbs, currencyBefore.magicOrbs, "magicOrbs - 1");
				assert.equal(data.scrolls.identify, currencyBefore.scrolls.identify, "scrolls - 1");
				assert.equal(data.scrolls.summonHero, currencyBefore.scrolls.summonHero, "scrolls - 1");
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('Set User XP (/user/xp/)', done => {
		const chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendAuth('/user/xp', 'put', {
			body: { xp: 1234 }
		})
			.then(data => {
				assert.exists(data);
				assert.equal(data.game.xp, 1234, 'XP matches.');
				done();
			})
			.catch(err => done(err));
	});

	it('Logout (chamberlainpi)', done => {
		const chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendAuth('/user/logout', 'get')
			.then(data => {
				chamberlainpi.login.token = null;
				assert.exists(data);
				done();
			})
			.catch(err => {
				done(err);
			});
	});
});