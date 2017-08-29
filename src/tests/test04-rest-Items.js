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
const sendAPIAuth = chaiG.sendAPIAuth;

describe('=REST= Items', () => {
	var chamberlainpi;

	it('Add random item weapon', done => {
		chamberlainpi = chaiG.testUsers.chamberlainpi;

		sendAPIAuth('/item/random/weapon', 'post', {
			body: { actZone: 1 }
		})
			.then(data => {
				assert.exists(data);
				assert.equal(data.userId, chamberlainpi.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Get all items', done => {
		sendAPIAuth('/item/list', 'get')
			.then(datas => {
				assert.exists(datas);
				assert.equal(datas.length, 1);
				done();
			})
			.catch(err => done(err));

	});
});