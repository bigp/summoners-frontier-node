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

describe('=REST= Items', () => {
	var chamberlainpi, peter;

	function randomSeeds(quality, affix, itemLevel, variance) {
		return {quality: quality, affix: affix, itemLevel: itemLevel, variance: variance};
	}

	it('Generate random item weapon (chamberlainpi)', done => {
		chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendAuth('/item/random/weapon', 'post')
			.then(data => {

				assert.exists(data);
				assert.equal(data.length>0, true);
				assert.equal(data[0].userId, chamberlainpi.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Generate random item weapon (chamberlainpi ANOTHER FEW [5] )', done => {
		chamberlainpi = testUsers.chamberlainpi;
		var quantity = 5;
		chamberlainpi.sendAuth('/item/random/weapon/' + quantity, 'post')
			.then(data => {
				assert.equal(data.length, quantity);
				assert.equal(data[0].userId, chamberlainpi.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Generate random item weapon (peter NOT logged in)', done => {
		peter = testUsers.peter;
		peter.sendAuth('/item/random/weapon', 'post')
			.then(data => {
				assert.notExists(data);
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Generate random item weapon (peter WHEN logged in)', done => {
		peter.sendLogin()
			.then(() => peter.sendAuth('/item/random/weapon', 'post'))
			.then(data => {
				assert.exists(data);
				assert.equal(data[0].userId, peter.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));
	});

	it('Generate random item weapon (peter FAIL add too many [33])', done => {
		peter.sendAuth('/item/random/weapon/33', 'post')
			.then(data => {
				assert.notExists(data);
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Generate random item weapon (peter WHEN logged in, add [3])', done => {
		peter.sendAuth('/item/random/weapon/3', 'post')
			.then(data => {
				assert.exists(data);
				assert.equal(data[0].userId, peter.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));
	});

	it('Get all items', done => {
		chamberlainpi.sendAuth('/item/list', 'get')
			.then(datas => {
				assert.exists(datas);
				assert.equal(datas.length, 6);
				done();
			})
			.catch(err => done(err));

	});

	it('Get all items (FAIL wrong HTTP VERB)', done => {
		chamberlainpi.sendAuth('/item/list', 'post')
			.then(datas => {
				assert.notExists(datas);
				done('Should not exists!');
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done()
			});

	});

	it('Add custom item (VALID for chamberlainpi)', done => {
		chamberlainpi.sendAuth('/item/add', 'post', {
			body: {
				list: [
					{identity: 'item_sword', randomSeeds: randomSeeds(1,1,1,1)},
					{identity: 'item_scythe', randomSeeds: randomSeeds(2,2,2,2)},
					{identity: 'item_sword', randomSeeds: randomSeeds(3,3,3,3)}
				]
			}
		})
			.then(datas => {
				// trace("chamberlainpi's new items...");
				// trace(datas);
				assert.exists(datas);
				assert.exists(datas.newest);
				assert.notExists(datas.oldest);

				done();
			})
			.catch(err => done(err));

	});

	it('Get all items (and STORE it)', done => {
		chamberlainpi.sendAuth('/item/list', 'get')
			.then(datas => {
				assert.exists(datas);

				chamberlainpi.items = datas;

				done();
			})
			.catch(err => done(err));

	});

	it('Add custom item (INVALID for peter)', done => {
		peter.sendAuth('/item/add', 'post', {
			body: {
				list: [
					{identity: 'item_sword', randomSeeds: randomSeeds(4,4,4,4)},
					{identity: 'item_bazooka', randomSeeds: randomSeeds(5,5,5,5)},
					{identity: 'item_frying_pan', randomSeeds: randomSeeds(6,6,6,6)},
				]
			}
		})
			.then(datas => {
				assert.notExists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Add custom item (NO LIST for peter)', done => {
		peter.sendAuth('/item/add', 'post', {
			body: {
				empty: true
			}
		})
			.then(datas => {
				assert.notExists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Add custom item (VALID for peter)', done => {
		peter.sendAuth('/item/add', 'post', {
			body: {
				showAll: 1,
				list: [
					{identity: 'item_sword', randomSeeds: randomSeeds(7,7,7,7)},
				]
			}
		})
			.then(datas => {
				// trace("peter's new items...");
				assert.exists(datas);
				assert.exists(datas.newest);
				assert.exists(datas.oldest);
				done();
			})

	});
});