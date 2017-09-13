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

describe('=REST= Explorations', () => {
	if(chaiG.filterLevel < 2) return;

	var chamberlainpi, peter;

	it('INIT', done => {
		chamberlainpi = testUsers.chamberlainpi;
		peter = testUsers.peter;
		done();
	});

	function successTest(url, header, body, onData) {
		var method = "get";
		if(url.has('::')) {
			var urlSplit = url.split('::');
			method = urlSplit[0];
			url = urlSplit[1];
		}

		it(`/exploration${url} ... ${header}`, done => {
			if(_.isFunction(body)) body = body();
			chamberlainpi.sendAuth('/exploration' + url, method, body)
				.then(data => {
					assert.exists(data);
					onData(data);
					done();
				})
				.catch(err => done(err));
		});
	}

	function failTest(url, header, body) {
		var method = "get";
		if(url.has('::')) {
			var urlSplit = url.split('::');
			method = urlSplit[0];
			url = urlSplit[1];
		}

		it(`/exploration${url} ... ${header}`, done => {
			if(_.isFunction(body)) body = body();
			chamberlainpi.sendAuth('/exploration' + url, method, body)
				.then(data => {
					done('Should not exists!');
				})
				.catch(err => {
					//trace((err.message).yellow);
					assert.exists(err);
					done();
				});
		});
	}

	failTest('/9999/', 'FAIL getting non-existant ActZone');
	failTest('/9999/update', 'FAIL Wrong Verb');
	failTest('put::/9999/update', 'FAIL Missing Field');
	failTest('put::/1/update', 'Update?');
	failTest('put::/1/update', 'MISSING exploration', {
		body: { isAutoCreate: true, }
	});

	failTest('put::/1/update', 'MISSING exploration fields', {
		body: {
			isAutoCreate: true,
			exploration: {}
		}
	});

	successTest('put::/1/update', 'Update?', {
		body: {
			isAutoCreate: true,
			exploration: {
				accumulativeDamage: 1,
				chests: 1,
				dateStarted: moment()
			}
		}
	}, data => {
		trace(data);
	});

	// failTest('post::/url-does-not-exists', '(chamberlainpi FAIL URL DOES NOT EXISTS');
	// failTest('get::/add', '(chamberlainpi FAIL Wrong Verb)');
	// failTest('post::/add', '(chamberlainpi FAIL Missing lootCrate field)');
	//
	// successTest('post::/add', '(chamberlainpi OK)', {
	// 	body: {
	// 		lootCrate: {
	// 			lootTableIdentity: 'lootTableIdentity',
	// 			lootCrateType: 'lootCrateType',
	// 			zoneIdentity: 'zoneIdentity',
	// 			magicFind: 1,
	// 			name: 'LootCrate Name',
	// 		}
	// 	}
	// }, data => {
	// 	assert.isTrue(data.id > 0, 'ID is valid.');
	// 	assert.exists(data.game, '"game" object exists.');
	// 	assert.isTrue(data.game.lootTableIdentity.length>0, 'Has a lootTableIdentity.');
	// 	assert.isTrue(data.game.lootCrateType.length>0, 'Has a lootCrateType.');
	// 	assert.isTrue(data.game.zoneIdentity.length>0, 'Has a zoneIdentity.');
	// 	assert.isTrue(data.game.magicFind>0, 'Has magicFind.');
	// 	assert.isTrue(data.game.name.length>0, 'Has a name.');
	// });
	//
	// successTest('delete::/remove/1', '(chamberlainpi OK)', null,
	// 	data => {
	// 		assert.isTrue(data.isRemoved, 'isRemoved === true.');
	// 		assert.isTrue(data.numRemoved===1, 'numRemoved === 1.');
	// 	}
	// );
});