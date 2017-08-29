/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const sendAPI = chaiG.sendAPI;
const TestUsers = chaiG.TestUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;

describe('=REST= Items', () => {

	const userToAdd = chaiG.userToAdd;

	it('Add random item weapon', done => {
		sendAPI('/item/random/weapon', 'post', {
			headers: {'Authorization': chaiG.userAuth},
			body: { actZone: 1 }
		})
			.then(data => {
				assert.exists(data);
				assert.equal(data.userId, chaiG.userToAdd.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Get all items', done => {
		sendAPI('/item/list', 'get', {
			headers: {'Authorization': chaiG.userAuth}
		})
			.then(datas => {
				assert.exists(datas);
				assert.equal(datas.length, 1);
				done();
			})
			.catch(err => done(err));

	});
});