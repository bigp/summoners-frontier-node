/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const mongoose = chaiG.mongoose;
const request = chaiG.request;
const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const User = $$$.models.User;
const Item = $$$.models.Item;
const testUsers = chaiG.testUsers;
const sendAPI = $$$.send.api;


describe('=MONGO= Users', () => {
	var db;

	try { db = mongoose.connection.db } catch(err) {}

	it('Mongoose Init', done => {
		assert.exists(mongoose);
		assert.exists(mongoose.connection, 'Connection exists?');
		assert.exists(mongoose.connection.db, 'Database exists?');

		db.listCollections().toArray((err, list) => {
			err && traceError(err);
			chaiG.collectionNames = list.map(db => db.name).filter(listName => listName!=='identitycounters');

			done();
		});
	});

	it('Drop Collections (ALL)', done => {
		const drops = chaiG.collectionNames.map(listName => db.dropCollection(listName));

		Promise.all(drops)
			.then(datas => {
				assert.equal(datas.length, drops.length, 'Successfully dropped all tables?');

				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('Reset User Count', done => {
		_.values($$$.models).forEach(model => {
			model.resetCount((err, ok) => {
				if(err) return done(err);
			});
		});

		setTimeout(() => {
			done();
		}, 100);
	});

	it('Create "Pierre"', done => {
		const Pierre = new User({ name: "Pierre", email: "pierre@pierrechamberlain.ca", username: "pierre", _password: $$$.md5('PI#RR#') });

		Pierre.save()
			.then(data => {
				testUsers.pierre = Pierre;

				assert.exists(Pierre);
				assert.equal(Pierre.name, "Pierre", "Should be correct name.");
				assert.equal(Pierre.email, "pierre@pierrechamberlain.ca", "Should be correct email.");

				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('Create "Pierre" long password', done => {
		const Pierre = new User({ name: "Pierre2", email: "pierre@pierrechamberlain.ca2", username: "pierre", _password: 'PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#' });

		Pierre.save()
			.then(data => {
				assert.notExists(Pierre);

				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Create "Pierre" long email', done => {
		const Pierre = new User({
			name: "Pierre2", username: "pierre4", _password: $$$.md5('PI#RR#'),
			email: "pierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierre@pierrechamberlain.ca"
		});

		Pierre.save()
			.then(data => {
				assert.notExists(Pierre);

				done();
			})
			.catch(err => {
				assert.exists(err);

				const output = [];

				_.keys(err.errors).forEach(key => {
					output.push(err.errors[key]);
				});

				//trace(output.join("\n").yellow);

				done();
			});
	});

	it('Create 2nd "Pierre"', done => {
		const Pierre = new User({ name: "Pierre", email: "pierre2@gmail.com", username: "pierre", _password: 'pi3rr3' });

		Pierre.save( (err, data) => {
			if(err) throw err;

			assert.exists(Pierre);
			assert.equal(Pierre.email, "pierre2@gmail.com", "Should be correct email.");

			done();
		});
	});

	it('Create "Peter"', done => {
		const Peter = new User({ name: "Peter", email: "peter@gmail.com", username: "peter", _password: 'pi3rr3' });

		Peter.save( (err, data) => {
			if(err) throw err;

			testUsers.peter = data;

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