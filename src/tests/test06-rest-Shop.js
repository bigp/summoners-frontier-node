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

describe('=REST= Shop', () => {
	var chamberlainpi, peter, shopInfo;
	var delay = 1000;

	it('INIT', done => {
		chamberlainpi = testUsers.chamberlainpi;
		peter = testUsers.peter;
		done();
	});

	it('Get seed without authorization (FAIL)', done => {
		sendAPI('/shop/seed', 'get')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Get seed (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/seed', 'get')
			.then(datas => {
				assert.exists(datas);
				//assert.exists(datas.global);

				shopInfo = datas;

				setTimeout(() => {
					done();
				}, delay);
			})
			.catch(err => done(err));

	});

	it('Buy Item GLOBAL (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/buy/item', 'post', {
			body: {
				guid: shopInfo.guid,
				item: {
					guid: shopInfo.itemKeys[0],
					id: 1,
					identify: 'GLOBAL_ITEM',
					name: 'A cool name for a global item'
				}
			}
		})
			.then(datas => {
				assert.exists(datas);
				assert.exists(datas.game);
				assert.exists(datas.dateCreated);
				assert.equal(datas.userId, chamberlainpi.id, "User ID matches.");
				assert.equal(datas.game.isPremium, false, "Is NOT Premium item.");

				setTimeout(() => {
					done();
				}, delay);

			})
			.catch(err => done(err));
	});

	it('Get seed again (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/seed', 'get')
			.then(datas => {
				assert.exists(datas);
				//assert.exists(datas.global);

				shopInfo = datas;

				setTimeout(() => {
					done();
				}, delay);
			})
			.catch(err => done(err));
	});

	it('Buy & Get Seed PREMIUM (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/seed', 'post')
			.then(datas => {
				assert.exists(datas);

				shopInfo = datas;

				setTimeout(() => {
					done();
				}, delay);
			})
			.catch(err => done(err));

	});

	it('Buy Item PREMIUM (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/buy/item', 'post', {
			body: {
				guid: shopInfo.guid,
				item: {
					guid: shopInfo.itemKeys[0],
					id: 1,
					isPremium: true,
					identify: 'some_cool_name',
					name: 'A cool name for an item'
				}
			}
		})
			.then(datas => {
				assert.exists(datas);
				assert.equal(datas.userId, chamberlainpi.id, "User ID matches.");
				assert.equal(datas.game.isPremium, true, "It IS a Premium item.");

				setTimeout(() => {
					done();
				}, delay);

			})
			.catch(err => done(err));

	});

	it('Get seed PREMIUM (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/seed', 'get')
			.then(datas => {
				assert.exists(datas);
				assert.exists(datas.recentPurchases);
				assert.equal(datas.recentPurchases.length, 2, 'Should have couple recent purchases.');
				assert.equal(datas.recentPurchases[1], shopInfo.itemKeys[0], 'Should have matching item keys.');

				shopInfo = datas;

				setTimeout(() => {
					done();
				}, delay);

			})
			.catch(err => done(err));

	});



	it('Get seed (peter)', done => {
		peter.sendLogin()
			.then(() => peter.sendAuth('/shop/seed', 'get'))
			.then(datas => {
				assert.exists(datas);
				//assert.exists(datas.global);

				shopInfo = datas;

				setTimeout(() => {
					done();
				}, delay);
			})
			.catch(err => done(err));

	});

	it('Buy Item GLOBAL (peter)', done => {
		peter.sendAuth('/shop/buy/item', 'post', {
			body: {
				guid: shopInfo.guid,
				item: {
					guid: shopInfo.itemKeys[0],
					id: 1,
					identify: 'GLOBAL_ITEM_FOR_PETER',
					name: 'A cool name for a global item'
				}
			}
		})
			.then(datas => {
				assert.exists(datas);
				assert.exists(datas.game);
				assert.exists(datas.dateCreated);
				assert.equal(datas.userId, peter.id, "User ID matches.");
				assert.equal(datas.game.isPremium, false, "Is NOT Premium item.");

				setTimeout(() => {
					done();
				}, delay);

			})
			.catch(err => done(err));
	});
});