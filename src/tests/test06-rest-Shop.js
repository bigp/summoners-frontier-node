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

describe('=REST= Shop', () => {
	var chamberlainpi, peter;
	var delay = 1000;

	it('INIT', done => {
		chamberlainpi = testUsers.chamberlainpi;
		peter = testUsers.peter;
		done();
	});

	it('Get Shop Random Seed 1 (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/seed', 'get')
			.then(datas => {
				assert.exists(datas);
				setTimeout(() => {
					done();
					trace(datas);
				}, delay);
			})
			.catch(err => done(err));

	});

	it('Buy Premium Seed #2 (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/buy-seed', 'post')
			.then(datas => {
				assert.exists(datas);

				setTimeout(() => {
					done();
					trace("BOUGHT A PREMIUM SEED!");
					trace(datas.game.shopInfo);
				}, delay);
			})
			.catch(err => done(err));

	});

	it('Get Shop Random Seed 2 (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/seed', 'get')
			.then(datas => {
				assert.exists(datas);
				assert.exists(datas.premium, "Premium seed and expiry details.");

				setTimeout(() => {
					done();
					trace(datas);
				}, delay);

			})
			.catch(err => done(err));

	});

	it('Generate Shop Items (FAIL NOT AUTHORIZED)', done => {
		sendAPI('/shop/seed', 'get')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});

	});
});