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
const TEST = chaiG.makeFailAndOK('exploration');

describe('=REST= Explorations', () => {
	if(chaiG.filterLevel < 2) return;

	TEST.SET_USER(() => testUsers.chamberlainpi);

	TEST.FAIL('/9999/', 'FAIL getting non-existant ActZone');
	TEST.FAIL('/9999/update', 'FAIL Wrong Verb');
	TEST.FAIL('put::/9999/update', 'FAIL Missing Field');
	TEST.FAIL('put::/1/update', 'MISSING isAutoCreate');
	TEST.FAIL('put::/1/update', 'MISSING exploration', {
		body: { isAutoCreate: true, }
	});

	TEST.FAIL('put::/1/update', 'MISSING exploration fields', {
		body: {
			isAutoCreate: true,
			exploration: {}
		}
	});

	TEST.FAIL('put::/1/start', 'FAIL Wrong Verb', {
		body: {
			isAutoCreate: true,
			exploration: { dateStarted: moment() },
			party: [1,2,3, 9999],
		}
	});

	TEST.FAIL('post::/1/start', 'FAIL Missing Hero IDs', {
		body: {
			isAutoCreate: true,
			exploration: { dateStarted: moment() },
			party: [],
		}
	});

	TEST.FAIL('post::/1/start', 'FAIL Missing Exploration data / dateStarted', {
		body: {
			isAutoCreate: true,
			exploration: { dateStarted: null },
		}
	});

	TEST.OK('post::/1/start', 'Start! (read exploration & heroes data to confirm)', {
		body: {
			isAutoCreate: true,
			exploration: { dateStarted: moment() },
			party: [1,2,3],
		}
	}, data => {
		const heroes = data.heroes;
		const explore = data.exploration;
		assert.exists(heroes, 'Has heroes.');
		assert.exists(explore, 'Has exploration.');
		assert.exists(explore.game, 'Has Exploration.game.');
		assert.exists(explore.game.dateStarted, 'Has exploration.game.dateStarted.');
		assert.equal(explore.game.actZoneID, 1, 'ActZoneID matches.');
		assert.equal(data.numFound, 3, '# of heroes found.');
		assert.equal(data.numModified, 3, '# of heroes modified.');
		assert.equal(heroes.length, 3, 'heroes[] matches length.');
	});

	TEST.OK('put::/1/update', 'Update...', {
		body: {
			isAutoCreate: true,
			exploration: {
				accumulativeDamage: 1,
				chests: 1,
				dateStarted: moment()
			}
		}
	}, data => {
		assert.equal(data.game.actZoneID, 1, 'actzone is #1');
		assert.equal(data.game.chests, 1, 'chests is #1');
		assert.exists(data.game.dateStarted, 'dateStarted is #1');
	});

	TEST.OK('get::/1', 'Get exploration #1', null, data => {
		assert.equal(data.id, 1, "exploration id #1");
	});

	TEST.FAIL('get::/1/complete', 'Complete exploration #1 (FAIL Wrong Verb)');
	TEST.FAIL('get::/2', 'Get exploration #2');

	TEST.OK('get::/list', 'List All Explorations', null, data => {
		assert.equal(data.length, 1, "Contains 1 exploration.");
	});

	TEST.OK('delete::/1/complete', 'Complete/Remove exploration #1', null, data => {
		assert.isTrue(data.isRemoved, 'Exploration #1 is removed');
		assert.equal(data.numRemoved, 1, 'Removed one exploration.');
	});

	///////////////////////////////////////TEST MORE Thoroughly...

});