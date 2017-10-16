/**
 * Created by Chamberlain on 8/29/2017.
 */

const gameHelpers = require('../sv-json-helpers');
const mgHelpers = require('../sv-mongo-helpers');
const mongoose = mgHelpers.mongoose;
const Schema  = mongoose.Schema;
const Types  = Schema.Types;
const CustomTypes  = mongoose.CustomTypes;
const ObjectId = Types.ObjectId;
const CONFIG = $$$.env.ini;
const moment = require('moment');
const momentRound = require('moment-round');
const dateUtils = require('../sv-date-utils');



module.exports = function() {
	const jsonGlobals = $$$.jsonLoader.globals['preset-1'];

	const isRoundedHours = _.isTruthy(jsonGlobals.SHOP_REFRESH_ROUNDED);
	const shopExpiresSplit = decodeURIComponent(jsonGlobals.SHOP_REFRESH_KEY_EXPIRES).split(" ");
	const shopExpires = {
		time: shopExpiresSplit[0] | 0,
		unit: shopExpiresSplit[1]
	};

	trace(shopExpires);

	const featuredItem = {config: null, interval: null, lastCheck: null, seed: 0};

	$$$.on('json-reloaded', setFeaturedItemIntervals);

	function setFeaturedItemIntervals() {
		const interval = decodeURIComponent(jsonGlobals.FEATURED_ITEM_INTERVAL);
		const startTime = decodeURIComponent(jsonGlobals.FEATURED_ITEM_START_TIME);
		const now = moment();

		var cfg = featuredItem.config = {
			_interval: interval,
			_startDate: moment(startTime)
		};

		featuredItem.interval = new dateUtils.IntervalChecker(cfg._interval, cfg._startDate);
	}

	setFeaturedItemIntervals();

	function checkUpdateFeaturedItem() {
		const now = moment().subtract(1, 'second');
		const intv = featuredItem.lastCheck;
		const diff = !intv ? 0 : now.diff(intv.dateNext);

		//intv && trace(intv.dateCurrent.toISOString() + " -- " + intv.dateNext.toISOString());

		if(diff<0) return;

		featuredItem.lastCheck = featuredItem.interval.getValue();
		featuredItem.seed = (Math.random() * 2000000000) | 0;
	}

	setInterval(checkUpdateFeaturedItem, 1000);

	checkUpdateFeaturedItem();

	function createFeatureResponse(dateLast) {
		dateLast = moment(dateLast);
		const dateCurrent = featuredItem.lastCheck.dateCurrent;
		const dateNext = featuredItem.lastCheck.dateNext;
		const diff = dateLast.diff(dateCurrent);

		return {
			seed: featuredItem.seed,
			isItemPurchased: diff > 0,
			dateCurrent: dateCurrent,
			dateNext: dateNext
		}
	}

	var User, Shop, Item;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
	});

	function createExpiryAndSecondsLeft(source) {
		if(!source) return null;
		const results = source.toJSON ? source.toJSON() : _.clone(source);
		const date = moment(source._dateGenerated);
		const expires = date.clone().add(shopExpires.time, shopExpires.unit);

		results.dateExpires = expires.toDate();
		results.secondsLeft = expires.diff(moment(), "seconds");
		return results;
	}

	function refreshUserKey(req) {
		const user = req.auth.user;
		const refreshKey = user.game.shopInfo.refreshKey;
		const now = moment();

		//const seed = refreshKey.seed;
		refreshKey.seed = (Math.random() * 2000000) | 0;
		refreshKey._dateGenerated = isRoundedHours ? now.startOf('hour') : now;

		req.shopSession.refreshKey = createExpiryAndSecondsLeft(refreshKey);

		return user.save();
	}

	const ERROR_COST = 'Missing "cost" field on POST data (specify gold / gems / magic / etc.).';

	function isCostMissing(cost, currency, hasSufficient) {
		if(!cost) throw ERROR_COST;
		if(!currency) throw "Missing argument 'userCurrency' in isCostMissing(...)";

		//Validate cost information:
		var hasAnyData = false;
		_.keys(cost).forEach( coinType => {
			const value = cost[coinType];
			if(isNaN(value) || value <= 0) {
				throw 'Invalid currency value for type: ' + coinType;
			}

			if(isNaN(currency[coinType])) {
				throw 'Invalid currency type, user does not have any: ' + coinType;
			}

			if(hasSufficient && currency[coinType] < value) {
				throw `Insufficient ${coinType} to purchase this item.`;
			}

			hasAnyData = true;
		});

		if(!hasAnyData) throw ERROR_COST;

		return false;
	}

	function modifyCost(cost, currency, multiplier) {
		_.keys(cost).forEach( key => {
			currency[key] += multiplier * Math.abs(cost[key]);
		});
	}

	return {
		plural: 'shop',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'*'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const shopInfo = user.game.shopInfo;
				var refreshKey = createExpiryAndSecondsLeft(shopInfo.refreshKey);
				req.shopSession = { refreshKey: refreshKey };

				Model.find({userId: user.id, 'game.item.seed': refreshKey.seed })
					.then( purchases => {
						var purchaseIndices = purchases.map( i => i.game.item.index );

						refreshKey.purchased = purchaseIndices;

						if(refreshKey.secondsLeft < 0) {
							return refreshUserKey(req).then(() => next());
						}

						next();
					});
			},

			'key$/'(Model, req, res, next, opts) {
				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					mgHelpers.sendFilteredResult(res, req.shopSession);
				})
					.catch(err => $$$.send.error(res, err.message))
			},

			'key/refresh'(Model, req, res, next, opts) {
				const cost = opts.data.cost;
				const user = req.auth.user;
				const currency = user.game.currency;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;
					if(isCostMissing(cost, currency, true)) return;

					modifyCost(cost, currency, -1);

					return refreshUserKey(req);
				})
					.then(savedUser => {
						var results = _.extend({
							isRefreshed: true,
							currency: currency
						}, req.shopSession);

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err.message || err))
			},

			'featured-item$/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const shopInfo = user.game.shopInfo;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					mgHelpers.sendFilteredResult(res, createFeatureResponse(shopInfo.dateLastPurchasedFeaturedItem));
				})
					.catch(err => {
						$$$.send.error(res, err.message || err);
					})
			},

			'featured-item/buy'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const shopInfo = user.game.shopInfo;
				const currency = user.game.currency;
				const results = { isPurchased: true };

				var itemCost, featureResponse;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'POST')) return;

					featureResponse = createFeatureResponse(shopInfo.dateLastPurchasedFeaturedItem);
					if(featureResponse.isItemPurchased) throw 'Item is already purchased!';

					itemCost = opts.data.cost;
					if(!itemCost) throw ERROR_COST;

					if(isCostMissing(itemCost, currency, true)) return;

					return Item.addItems(req, res, next, opts);
				})
					.then( itemResults => {
						modifyCost(itemCost, currency, -1);

						results.item = itemResults.newest[0];
						results.currency = currency;

						shopInfo.dateLastPurchasedFeaturedItem = moment();

						return user.save();
					})
					.then( saved => {
						featureResponse = createFeatureResponse(shopInfo.dateLastPurchasedFeaturedItem);

						mgHelpers.sendFilteredResult(res, _.extend(results, featureResponse));
					})
					.catch(err => {
						$$$.send.error(res, err.message || err);
					})
			},

			'buy/item'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const itemData = opts.data.item;
				const refreshKey = req.shopSession.refreshKey;
				const results = { isPurchased: true };

				var itemCost;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'POST')) return;
					if(!itemData) throw 'Missing "item" in POST data.';
					if(isNaN(itemData.index)) throw 'Missing "item.index" in POST data.';
					if(isNaN(itemData.seed)) throw 'Missing "item.seed" in POST data.';
					if(itemData.seed!==refreshKey.seed) throw 'Incorrect "item.seed" used, does not match current refresh seed.';

					itemCost = opts.data.cost;
					if(!itemCost) throw ERROR_COST;

					if(isCostMissing(itemCost, currency, true)) return;

					return Model.find({
						userId: user.id,
						'game.item.index': itemData.index,
						'game.item.seed': itemData.seed,
					})
				})
					.then( existingItems => {
						if(existingItems && existingItems.length>0) {
							throw 'You already purchased this item: ' + _.jsonPretty(existingItems[0]);
						}

						//Add the items to the list:
						return Item.addItems(req, res, next, opts);
					})
					.then( itemResults => {
						modifyCost(itemCost, currency, -1);

						//TODO for multiple items, solve why the '_...' private properties leak through this!
						results.item = itemResults.newest[0];

						const shopItem = new Model();
						shopItem.userId = user.id;
						shopItem.game = _.extend({
							item: itemData,
							cost: itemCost
						}, refreshKey);

						return Promise.all([
							user.save(),
							shopItem.save()
						]);
					})
					.then( savedUserAndShopItem => {
						results.currency = currency;
						results.shop = savedUserAndShopItem[1].toJSON();

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err.message || err));
			},

			'sell/item$/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const cost = opts.data.cost;
				const item = opts.data.item;
				const results = {isSold: true};

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'DELETE')) return;

					if(!item) throw 'Missing "item" field in POST data!';
					if(!item.id) throw 'Missing "item.id" field in POST data!';

					if(isCostMissing(cost, currency, false)) return;

					modifyCost(cost, currency, 1);

					return Promise.all([
						Item.remove({userId: user.id, id: item.id}),
						user.save()
					]);
				})
					.then( both => {
						const removalStatus = both[0].toJSON();

						//const userSaved = both[1];
						results.numItemsSold = removalStatus.n;
						results.currency = currency;
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err.message || err));
			},

			//SELL MULTIPLE ITEMS!!!
			'sell/items$/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const cost = opts.data.cost;
				const items = opts.data.items;
				const results = {isSold: true};

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'DELETE')) return;

					if(!items || !items.length) throw 'Missing "items" field in POST data!';
					if(!items[0]) throw 'Empty/null item found on "items[0]"!';
					if(!items[0].id) throw 'Missing "items[0].id" field in POST data!';

					if(isCostMissing(cost, currency, false)) return;

					modifyCost(cost, currency, 1);

					var allIDs = items.map((item, i) => {
						if(!item) throw 'One of the supplied items is null! ' + i;
						return item.id;
					});

					return Promise.all([
						Item.remove({userId: user.id, id: {$in: allIDs}}),
						user.save()
					]);
				})
					.then( both => {
						const removalStatus = both[0].toJSON();

						//const userSaved = both[1];
						results.numItemsSold = removalStatus.n;
						results.currency = currency;
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err.message || err));
			}
		},

		methods: {
			toDebugID() {
				return this.game.identity+"#" + this.id;
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				//guid: CustomTypes.String128(),
				_dateGenerated: CustomTypes.DateRequired({default: new Date(0)}),

				item: {
					index: CustomTypes.Int({required: true}),
					seed: CustomTypes.LargeInt({min: -1, default: -1, required: true}),
				},

				cost: {
					gold: CustomTypes.Int(),
					gems: CustomTypes.Int(),
					scrollIdentify: CustomTypes.Int(),
					scrollSummonHero: CustomTypes.Int(),
					magicOrbs: CustomTypes.Int(),
				}
			}
		}
	};
};