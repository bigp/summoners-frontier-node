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

describe('=REST= Heroes', () => {
	var chamberlainpi, peter;

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
				assert.notExists(data);
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
					{identity: 'hero_marauder', randomSeed: 1},
					{identity: 'hero_guardian', randomSeed: 2},
					{identity: 'hero_battlemage', randomSeed: 3},
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
					{identity: 'hero_marauder', randomSeed: 4},
					{identity: 'hero_guardian', randomSeed: 5},
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

	it('Equip item to a hero', done => {
		const hero0 = chamberlainpi.heroes[0];
		const item0 = chamberlainpi.items[0];

		chamberlainpi.sendAuth(`/hero/${hero0.id}/equip/${item0.id}`, 'put', {
			body: {
				item: {id: item0.id}
			}
		})
			.then(datas => {
				trace(JSON.stringify(datas, null, '  ').yellow);
				//trace(hero0);
				//trace(item0);
				assert.exists(datas);
				done();
			})
			.catch(err => done(err));

	});
});