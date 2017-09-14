/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');
const moment = require('moment');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;

describe('=REST= Heroes', () => {
	if(chaiG.filterLevel < 2) return;

	var chamberlainpi, peter, hero0, hero1, item0, item1;

	it('INIT', done => {
		chamberlainpi = testUsers.chamberlainpi;
		peter = testUsers.peter;
		done();
	});

	it('Generate random Heroes (chamberlainpi ANOTHER FEW [5] )', done => {
		chamberlainpi.sendAuth('/hero/random/5', 'post')
			.then(data => {
				assert.exists(data);
				assert.equal(data.length>0, true);
				assert.equal(data[0].userId, chamberlainpi.id, "Hero ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Generate random Heroes weapon (peter FAIL TOO MANY)', done => {
		peter = testUsers.peter;
		peter.sendAuth('/hero/random/19', 'post')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Generate random Heroes weapon (FAIL UNAUTHORIZED)', done => {
		sendAPI('/hero/random/19', 'post')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});

	it('Add Custom Heroes (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/hero/add', 'post', {
			body: {
				list: [
					{identity: 'hero_marauder', randomSeeds: {variance: 1}},
					{identity: 'hero_guardian', randomSeeds: {variance: 2}},
					{identity: 'hero_battlemage', randomSeeds: {variance: 3}},
				]
			}
		})
			.then(data => {
				assert.exists(data.newest);
				assert.equal(data.newest.length, 3);
				assert.equal(data.newest[0].userId, chamberlainpi.id, "Hero ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Add Custom Heroes (chamberlainpi with showAll)', done => {
		chamberlainpi.sendAuth('/hero/add', 'post', {
			body: {
				showAll:1,
				list: [
					{identity: 'hero_marauder', randomSeeds: {variance: 4}},
					{identity: 'hero_guardian', randomSeeds: {variance: 5}},
				]
			}
		})
			.then(data => {
				assert.exists(data.oldest);
				assert.exists(data.newest);
				assert.equal(data.newest.length, 2);
				assert.equal(data.newest[0].userId, chamberlainpi.id, "newest Hero ID == User ID");
				assert.equal(data.oldest[0].userId, chamberlainpi.id, "oldest Hero ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Get all heroes', done => {
		chamberlainpi.sendAuth('/hero/list', 'get')
			.then(datas => {
				assert.exists(datas);
				assert.equal(datas.length, 10);
				chamberlainpi.heroes = datas;
				done();

			})
			.catch(err => done(err));

	});

	////////////////////////////////////////////////////// EQUIP TESTS

	it('Equip item to a hero (0 - 0)', done => {
		hero0 = chamberlainpi.heroes[0];
		item0 = chamberlainpi.items[0];
		hero1 = chamberlainpi.heroes[1];
		item1 = chamberlainpi.items[1];

		chamberlainpi.sendAuth(`/item/${item0.id}/equip-to/${hero0.id}`, 'put')
			.then(datas => {
				assert.exists(datas.item);
				assert.equal(datas.previousHeroID, 0);
				done();
			})
			.catch(err => done(err));

	});

	it('Equip item to a hero (1 - 1)', done => {
		chamberlainpi.sendAuth(`/item/${item1.id}/equip-to/${hero1.id}`, 'put')
			.then(datas => {
				assert.exists(datas.item);
				assert.equal(datas.previousHeroID, 0);
				done();
			})
			.catch(err => done(err));

	});

	it('Equip item to a hero (PASS FROM PREVIOUS HERO!)', done => {
		chamberlainpi.sendAuth(`/item/${item0.id}/equip-to/${hero1.id}`, 'put')
			.then(datas => {
				assert.exists(datas.item);
				assert.equal(datas.previousHeroID, 1);
				done();
			})
			.catch(err => done(err));
	});

	it('Unequip item 0', done => {
		chamberlainpi.sendAuth(`/item/${item0.id}/unequip`, 'put')
			.then(data => {
				assert.exists(data);
				done();
			})
			.catch(err => done(err));
	});

	it('Get list of items (chamberlainpi)', done => {
		chamberlainpi.sendAuth(`/item/list`, 'get')
			.then(data => {
				assert.exists(data);
				assert.equal(data.length>0, true);
				done();
			})
			.catch(err => done(err));
	});

	it('Check equipped items (chamberlainpi on hero0)', done => {
		chamberlainpi.sendAuth(`/item/equipped-on/${hero0.id}`, 'get')
			.then(data => {
				assert.exists(data);
				assert.equal(data.length, 0);
				done();
			})
			.catch(err => done(err));
	});

	it('Check equipped items (chamberlainpi on hero1)', done => {
		chamberlainpi.sendAuth(`/item/equipped-on/${hero1.id}`, 'get')
			.then(data => {
				assert.exists(data);
				assert.equal(data.length, 1);
				assert.equal(data[0].userId, chamberlainpi.id);
				assert.equal(data[0].game.heroEquipped, hero1.id);
				done();
			})
			.catch(err => done(err));
	});

	it('Check NON-equipped items (chamberlainpi)', done => {
		chamberlainpi.sendAuth(`/item/equipped-off`, 'get')
			.then(data => {
				assert.exists(data);
				assert.equal(data.length>0,true);

				done();
			})
			.catch(err => done(err));
	});

	it('Equip item to a hero (FAIL with WRONG HERO ID)', done => {
		chamberlainpi.sendAuth(`/item/1/equip-to/9999`, 'put')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Equip item to a hero (FAIL with WRONG ITEM ID)', done => {
		chamberlainpi.sendAuth(`/item/9999/equip-to/1`, 'put')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Equip item to a hero (FAIL UNAUTHORIZED)', done => {
		sendAPI(`/item/1/equip-to/1`, 'put')
			.then(data => {
				assert.notExists(data);
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Check equipped items (chamberlainpi on hero 9999 [EMPTY])', done => {
		chamberlainpi.sendAuth(`/item/equipped-on/9999`, 'get')
			.then(data => {
				assert.exists(data);
				assert.equal(data.length, 0);
				done();
			})
			.catch(err => done(err));
	});

	////////////////////////////////////////////////////// TAP-ABILITY:

	it('Update Tap-Ability on a hero (1)', done => {
		const now = moment();
		const before = moment().subtract(5, 'minutes');

		chamberlainpi.sendAuth(`/hero/tap-ability/`, 'put', {
			body: {
				heroes: [
					{id: 1, tapAbility: now},
					{id: 2, tapAbility: before}
				]
			}
		})
			.then(datas => {
				assert.exists(datas);
				assert.isArray(datas);
				assert.equal(datas.length, 2, "Should have updated 2 heroes.");
				assert.equal(datas[0].id, 1, "Updated Hero 1.");
				assert.equal(datas[1].id, 2, "Updated Hero 2.");
				// assert.exists(datas.item);
				// assert.equal(datas.previousHeroID, 0);
				done();
			})
			.catch(err => done(err));

	});

	it('List available heroes (where "exploringActZone" == 0)', done => {
		chamberlainpi.sendAuth(`/hero/list/available`, 'get')
			.then(datas => {
				assert.exists(datas);
				assert.isArray(datas);
				assert.equal(datas[0].id, 1, "Listing Hero 1.");
				assert.equal(datas[1].id, 2, "Listing Hero 2.");
				done();
			})
			.catch(err => done(err));

	});


	////////////////////////////////////////////////////// DELETE

	it('Delete hero (chamberlainpi FAIL Wrong Verb)', done => {
		chamberlainpi.sendAuth(`/hero/1/remove`, 'get')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Delete hero (chamberlainpi with hero 1)', done => {
		chamberlainpi.sendAuth(`/hero/${hero1.id}/remove`, 'delete')
			.then(data => {
				assert.exists(data);
				assert.exists(data.removed);
				assert.equal(data.removed.id, 2);
				assert.equal(data.numItemsAffected, 1, 'Items affected.');
				done();
			})
			.catch(err => done(err));
	});

	it('Delete hero (chamberlainpi REMOVE ALL)', done => {
		chamberlainpi.sendAuth(`/hero/remove-all`, 'delete')
			.then(data => {
				assert.exists(data);
				assert.notExists(data.removed);
				assert.equal(data.numItemsAffected===0, true);
				done();
			})
			.catch(err => done(err));
	});
});