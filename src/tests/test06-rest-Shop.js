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
	if(chaiG.filterLevel < 4) return;

	var chamberlainpi, peter, shopInfo;
	const randomItemSeeds = chaiG.randomItemSeeds;
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
	
	function failTest(url, header, body) {
		it(`/shop${url} ... ${header}`, done => {
			if(_.isFunction(body)) body = body();
			chamberlainpi.sendAuth('/shop' + url, 'post', body)
				.then(data => {
					done('Should not exists!');
				})
				.catch(err => {
					assert.exists(err);
					done();
				});
		});
	}

	failTest('/buy/item', '(chamberlainpi FAIL missing item)');
	failTest('/buy/item', '(chamberlainpi FAIL item empty)', {
		body: {
			item: {}
		}
	});

	failTest('/buy/item', '(chamberlainpi FAIL missing seed)', {
		body: {
			item: {index: 0}
		}
	});

	failTest('/buy/item', '(chamberlainpi FAIL missing valid seed)', {
		body: {
			item: {index: 0, seed: -1}
		}
	});

	failTest('/buy/item', '(chamberlainpi FAIL missing cost)', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed}
			}
		}
	});

	failTest('/buy/item', '(chamberlainpi FAIL missing cost fields)', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {}
			}
		}
	});

	failTest('/buy/item', '(chamberlainpi FAIL invalid cost value [negative])', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {gold: -1}
			}
		}
	});

	failTest('/buy/item', '(chamberlainpi FAIL missing item list)', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {gold: 1}
			}
		}
	});

	var newItem;
	it('/buy/item ... (chamberlainpi OK)', done => {
		chamberlainpi.sendAuth('/shop/buy/item', 'post', {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {gold: 1},
				list: [{identity: 'item_sword', randomSeeds: randomItemSeeds(4,4,4,4)}],
			}
		})
			.then(data => {
				assert.exists(data);
				newItem = data.item;
				assert.exists(newItem);
				chamberlainpi.game.currency = data.currency;
				done(); //'Should not exists!'
			})
			.catch(err => done(err));
	});

	failTest('/buy/item', '(chamberlainpi FAIL item already exists valid cost)', () => {
		return {
			body: {
				item: {index: 0, seed: shopInfo.refreshKey.seed},
				cost: {gold: 1}
			}
		}
	});

	failTest('/sell/item', '(chamberlainpi FAIL missing item)', () => {
		return {
			body: {
				cost: {gold: 1}
			}
		}
	});

	failTest('/sell/item', '(chamberlainpi FAIL missing cost)', () => {
		return {
			body: {
				item: newItem
			}
		}
	});

	it('/sell/item ... (chamberlainpi OK to sell)', done => {
		chamberlainpi.sendAuth('/shop/sell/item', 'delete', {
			body: {
				item: newItem,
				cost: {gold: 1},
			}
		})
			.then(data => {
				assert.exists(data);
				assert.exists(data.currency);
				assert.isTrue(data.currency.gold === (chamberlainpi.game.currency.gold + 1), 'Should have some extra gold');
				assert.isTrue(data.isSold, 'isSold == true?');
				assert.isTrue(data.numItemsSold===1, 'numItemsSold == 1?');
				done();
			})
			.catch(err => done(err));
	});

	it('Get key AND show bought items (chamberlainpi)', done => {
		chamberlainpi.sendAuth('/shop/key', 'get')
			.then(datas => {
				assert.exists(datas);
				assert.exists(datas.refreshKey, 'Has a refreshKey');
				assert.isTrue(datas.refreshKey.seed>-1, 'Has a seed');
				assert.isTrue(datas.refreshKey.secondsLeft>=0, 'Has secondsLeft');
				assert.isArray(datas.refreshKey.purchased, 'Has purchased[] array.');
				assert.isTrue(datas.refreshKey.purchased.length===1, 'Has 1 purchase.');
				assert.isTrue(datas.refreshKey.purchased[0]===0, 'Purchase[0] === 0.');

				shopInfo = datas;

				setTimeout(() => {
					done();
				}, delay);
			})
			.catch(err => done(err));
	});
});