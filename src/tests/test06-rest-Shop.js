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
	var chamberlainpi, peter, shopInfo;
	var delay = 1000;

	it('INIT', done => {
		chamberlainpi = testUsers.chamberlainpi;
		peter = testUsers.peter;
		done();
	});

	it('Get seed without authorization (FAIL)', done => {
		sendAPI('/shop/seed', 'get')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Get seed (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/key', 'get')
			.then(datas => {
				assert.exists(datas);
				//assert.exists(datas.global);

				shopInfo = datas;

				setTimeout(() => {
					done();
					trace(shopInfo);
				}, delay);
			})
			.catch(err => done(err));
	});

	it('Get seed (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/key', 'get')
			.then(datas => {
				assert.exists(datas);
				//assert.exists(datas.global);

				shopInfo = datas;

				setTimeout(() => {
					done();
					trace(shopInfo);
				}, delay);
			})
			.catch(err => done(err));
	});

	it('Get seed (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/key', 'get')
			.then(datas => {
				assert.exists(datas);
				//assert.exists(datas.global);

				shopInfo = datas;

				setTimeout(() => {
					done();
					trace(shopInfo);
				}, delay);
			})
			.catch(err => done(err));
	});

	it('Refresh the key (chamberlainpi FAIL with Wrong Verb)', done => {
		chamberlainpi.sendAuth('/shop/key/refresh', 'get')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Refresh the key (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/key/refresh', 'put')
			.then(data => {
				trace(data);
				done();
			})
			.catch(err => done(err));
	});
});