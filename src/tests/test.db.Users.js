/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const mongoose = chaiG.mongoose;
const request = chaiG.request;
const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const sendAPI = chaiG.sendAPI;
const User = $$$.models.User;
const TestUsers = chaiG.TestUsers;

describe('=MONGO= Users', () => {
	var db;

	try { db = mongoose.connection.db } catch(err) {}

	it('Mongoose Init', () => {
		assert.exists(mongoose);
		assert.exists(mongoose.connection, 'Connection exists?');
		assert.exists(mongoose.connection.db, 'Database exists?');
	});

	it('Reset User Count', done => {
		User.resetCount((err, nextCount) => {
			if(err) throw err;

			assert.equal(nextCount, 1, 'Cleaned up the User auto-counter.');

			done();
		})
	});

	it('Drop User Collection', done => {
		db.dropCollection('users', (err, ok) => {
			if(err) throw err;

			assert.exists(ok, 'Successfully dropped "users"?');

			done();
		});
	});

	it('Create "Pierre"', done => {
		const Pierre = new User({ name: "Pierre", email: "chamberlainpi@gmail.com", username: "pierre" });

		Pierre.save( (err, data) => {
			if(err) throw err;

			TestUsers.pierre = data;

			assert.exists(Pierre);
			assert.equal(Pierre.name, "Pierre", "Should be correct name.");
			assert.equal(Pierre.email, "chamberlainpi@gmail.com", "Should be correct email.");

			done();
		});
	});

	it('Create 2nd "Pierre"', done => {
		const Pierre = new User({ name: "Pierre", email: "pierre2@gmail.com", username: "pierre" });

		Pierre.save( (err, data) => {
			if(err) throw err;

			assert.exists(Pierre);
			assert.equal(Pierre.email, "pierre2@gmail.com", "Should be correct email.");

			done();
		});
	});

	it('Create "Peter"', done => {
		const Peter = new User({ name: "Peter", email: "peter@gmail.com", username: "peter" });

		Peter.save( (err, data) => {
			if(err) throw err;

			TestUsers.peter = data;

			assert.equal(Peter.name, "Peter", "Should be correct name.");

			done();
		});
	});

	it('Get One (1, any)', done => {
		User.findOne().exec((err, data) => {
			if(err) throw err;

			assert.exists(data);
			assert.equal(data.name, 'Pierre');

			done();
		});
	});

	it('Get One (1, Pierre)', done => {
		User.findOne({name: 'Pierre'}).exec((err, data) => {
			if(err) throw err;

			assert.equal(data.name, 'Pierre');

			done();
		});
	});

	it('Get One (1, not found)', done => {
		User.findOne({name: 'John Doe'}).exec((err, data) => {
			if(err) throw err;

			assert.notExists(data);

			done();
		});
	});

	it('Get Many (all)', done => {
		User.find().exec((err, data) => {
			if(err) throw err;

			assert.isArray(data);
			assert.equal(data.length, 3);
			assert.equal(data[0].name, 'Pierre');
			assert.equal(data[2].name, 'Peter');

			done();
		});
	});

	it('Get Many (Pierre)', done => {
		User.find({name: 'Pierre'}).exec((err, data) => {
			if(err) throw err;

			assert.isArray(data);
			assert.equal(data.length, 2);
			assert.equal(data[0].name, 'Pierre');

			done();
		});
	});

	it('Get Many (peter@gmail.com)', done => {
		User.find({email: 'peter@gmail.com'}).exec((err, data) => {
			if(err) throw err;

			assert.isArray(data);
			assert.equal(data.length, 1);
			assert.equal(data[0].name, 'Peter');

			done();
		});
	});
});