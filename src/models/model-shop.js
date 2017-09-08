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

module.exports = function() {
	const GAME_RULES = CONFIG.GAME_RULES;
	const moment = require('moment');
	const isRoundedHours = _.isTruthy(GAME_RULES.SHOP_REFRESHED_ROUNDED_HOURS);
	const shopExpiresSplit = GAME_RULES.SHOP_EXPIRE_TIME.split(" ");
	const shopExpires = {
		time: shopExpiresSplit[0] | 0,
		unit: shopExpiresSplit[1]
	};

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

	function isCostMissing(cost, currency) {
		const ERROR_COST = 'Missing "cost" field on POST data (specify gold / gems / magic / etc.).';

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

			if(currency[coinType] < value) {
				throw `Insufficient ${coinType} to purchase this item.`;
			}

			hasAnyData = true;
		});

		if(!hasAnyData) throw ERR_COST;

		return false;
	}

	function modifyCost(cost, currency, isSubtract=false) {
		const multiplier = (isSubtract ? -1 : 1);
		_.keys(cost).forEach( key => {
			currency[key] += multiplier * cost[key];
		});
	}

	return {
		plural: 'shop',
		whitelist: ['game.identity', 'game.items'],
		blacklistVerbs: "GET_ONE GET_MANY POST_ONE POST_MANY DELETE_ONE DELETE_MANY PUT_ONE PUT_MANY".split(' '),

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
					if(isCostMissing(cost, currency)) return;

					modifyCost(cost, currency, true);

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

					if(!opts.data.cost) throw ERR_COST;

					itemCost = opts.data.cost;

					if(isCostMissing(itemCost, currency)) return;

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
						modifyCost(itemCost, currency);

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

			'sell/item'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const cost = opts.data.cost;
				const item = opts.data.item;
				const results = {isSold: true};

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'DELETE')) return;

					if(!item) throw 'Missing "item" field in POST data!';
					if(!item.id) throw 'Missing "item.id" field in POST data!';

					if(isCostMissing(cost, currency)) return;

					modifyCost(cost, currency, false);

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
					scrollsIdentify: CustomTypes.Int(),
					scrollsSummon: CustomTypes.Int(),
					magicOrbs: CustomTypes.Int(),
				}
			}
		}
	};
};