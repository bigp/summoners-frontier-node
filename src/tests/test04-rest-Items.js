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

	it('Add random item weapon (chamberlainpi)', done => {
		chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendAuth('/item/random/weapon', 'post')
			.then(data => {
				assert.exists(data);
				assert.equal(data.userId, chamberlainpi.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Add ANOTHER random item weapon (chamberlainpi)', done => {
		chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendAuth('/item/random/weapon', 'post')
			.then(data => {
				assert.exists(data);
				assert.equal(data.userId, chamberlainpi.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));

	});

	it('Add random item weapon (peter NOT logged in)', done => {
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

	it('Add random item weapon (peter WHEN logged in)', done => {
		peter = testUsers.peter;
		peter.sendLogin()
			.then(() => peter.sendAuth('/item/random/weapon', 'post'))
			.then(data => {
				assert.exists(data);
				assert.equal(data.userId, peter.id, "Item ID == User ID");
				done();
			})
			.catch(err => done(err));
	});

	it('Get all items', done => {
		chamberlainpi.sendAuth('/item/list', 'get')
			.then(datas => {
				assert.exists(datas);
				assert.equal(datas.length, 1);
				done();
			})
			.catch(err => done(err));

	});
});