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

	TEST.OK('put::/1/update', 'Update?', {
		body: {
			isAutoCreate: true,
			exploration: {
				accumulativeDamage: 1,
				chests: 1,
				dateStarted: moment()
			}
		}
	}, data => {
		//trace(data);
	});
});