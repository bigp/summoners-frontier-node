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

	it('1 Get key without authorization (FAIL)', done => {
		sendAPI('/shop/key', 'get')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('1.1 Get key (FAIL with Wrong Verb)', done => {
		chamberlainpi.sendAuth('/shop/key', 'delete')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('2 Get key (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/key', 'get')
			.then(datas => {
				assert.exists(datas);
				//assert.exists(datas.global);

				shopInfo = datas;

				setTimeout(() => {
					done();
				}, delay);
			})
			.catch(err => done(err));
	});

	it('3 Get key (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/key', 'get')
			.then(datas => {
				assert.exists(datas);

				shopInfo = datas;

				setTimeout(() => {
					done();
				}, delay);
			})
			.catch(err => done(err));
	});

	it('4 Refresh key (chamberlainpi FAIL with Wrong Verb)', done => {
		chamberlainpi.sendAuth('/shop/key/refresh', 'get')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('4 Refresh key (chamberlainpi FAIL missing POST data)', done => {
		chamberlainpi.sendAuth('/shop/key/refresh', 'put')
			.then(data => {
				done('Should not exists!');
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('5 Refresh the key (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/key/refresh', 'put', {
			body: {
				cost: {gold:1}
			}
		})
			.then(data => {
				shopInfo = data;
				done();
			})
			.catch(err => done(err));
	});
	
	/////////////////////////////////////////////////////////////////
	
	function failTest(header, body) {
		it(header, done => {
			if(_.isFunction(body)) body = body();
			chamberlainpi.sendAuth('/shop/buy/item', 'post', body)
				.then(data => {
					done('Should not exists!');
				})
				.catch(err => {
					assert.exists(err);
					done();
				});
		});
	}

	failTest('/buy/item ... (chamberlainpi FAIL missing item)');
	failTest('/buy/item ... (chamberlainpi FAIL item empty)', {
		body: {
			item: {}
		}
	});

	failTest('/buy/item ... (chamberlainpi FAIL missing seed)', {
		body: {
			item: {index: 0}
		}
	});

	failTest('/buy/item ... (chamberlainpi FAIL missing valid seed)', {
		body: {
			item: {index: 0, seed: -1}
		}
	});

	failTest('/buy/item ... (chamberlainpi FAIL missing cost)', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed}
			}
		}
	});

	failTest('/buy/item ... (chamberlainpi FAIL missing cost fields)', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {}
			}
		}
	});

	failTest('/buy/item ... (chamberlainpi FAIL invalid cost value [negative])', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {gold: -1}
			}
		}
	});

	it('/buy/item ... (chamberlainpi OK)', done => {
		chamberlainpi.sendAuth('/shop/buy/item', 'post', {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {gold: 1}
			}
		})
			.then(data => {
				assert.exists(data);
				done(); //'Should not exists!'
			})
			.catch(err => done(err));
	});

	failTest('/buy/item ... (chamberlainpi FAIL item already exists valid cost)', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {gold: 1}
			}
		}
	});
});