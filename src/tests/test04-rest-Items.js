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
	if(chaiG.filterLevel < 2) return;

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

	it('Add custom item (FAIL - INVALID for peter)', done => {
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

	it('Add custom item (FAIL - missing LIST for peter)', done => {
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

	var peterItem;
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

				peterItem = datas.newest[0];
				done();
			})

	});

	///////////////////////////////////////////////////// REMOVE ITEMS:

	it('Remove item (FAIL wrong VERB)', done => {
		peter.sendAuth(`/item/${peterItem.id}/remove`, 'get')
			.then(datas => {
				assert.notExists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Remove item (FAIL wrong id 9999)', done => {
		peter.sendAuth(`/item/9999/remove`, 'delete')
			.then(datas => {
				assert.notExists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Remove ALL items (FAIL wrong VERB)', done => {
		peter.sendAuth(`/item/remove-all`, 'get')
			.then(datas => {
				assert.notExists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Remove ALL items (peter)', done => {
		peter.sendAuth(`/item/remove-all`, 'delete')
			.then(data => {
				assert.exists(data);
				assert.equal(data.numRemoved, 5, "numRemoved");
				done();
			})
			.catch(err => {
				done(err);
			});

	});

	it('Get all items (peter, after deleting)', done => {
		peter.sendAuth('/item/list', 'get')
			.then(datas => {
				assert.exists(datas);
				assert.equal(datas.length, 0, "items == 0");
				done();
			})
			.catch(err => done(err));

	});

	/////////////////////////////////////////////////// IDENTIFY THE ITEMS:

	var item1, item2;
	it('Identify item 1 (FAIL wrong Verb)', done => {
		item1 = chamberlainpi.items[1];
		item2 = chamberlainpi.items[2];

		chamberlainpi.sendAuth(`/item/${item1.id}/identify`, 'get')
			.then(datas => {
				assert.notExists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Identify item 9999 (FAIL wrong Verb)', done => {
		chamberlainpi.sendAuth(`/item/9999/identify`, 'get')
			.then(datas => {
				assert.notExists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Identify item 1 (chamberlainpi)', done => {
		chamberlainpi.sendAuth(`/item/${item1.id}/identify`, 'put')
			.then(datas => {
				assert.exists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Identify item 1 (FAIL ALREADY IDENTIFIED)', done => {
		chamberlainpi.sendAuth(`/item/${item1.id}/identify`, 'put')
			.then(datas => {
				assert.notExists(datas);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Identify item 1 (FAIL NOT ENOUGH SCROLLS)', done => {
		chamberlainpi.sendAuth('/user/currency', 'put', {body: {scrolls:-9999}})
			.then(datas => {
				return chamberlainpi.sendAuth(`/item/${item2.id}/identify`, 'put')
			})
			.then(datas => {
				assert.notExists(datas);
				done(datas);
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});
});