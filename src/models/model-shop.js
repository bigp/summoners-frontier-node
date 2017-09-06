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

	const moment = require('moment');

	var User, Shop;
	var globalSeed = {}, lastItemKeys = [], isInited = false;
	var _interval = -1;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
	});

	function initShopList() {
		return new Promise((resolve, reject) => {
			if(isInited) return resolve();
			isInited = true;

			startLoop();
			loop();

			resolve();
		});
	}

	function startLoop() {
		stopLoop();
		_interval = setInterval( loop, 1000 * 60);
	}

	function stopLoop() {
		if(_interval<0) return;

		clearInterval( _interval);
		_interval = -1;
	}

	function loop() {
		lastItemKeys = globalSeed.itemKeys || [];
		globalSeed = {
			guid: _.guid(),
			seed: (Math.random() * 2000000000) | 0,
			_dateGenerated: new Date(),
			_premiumKeys: _.times(CONFIG.GAME_RULES.SHOP_ITEM_KEYS, () => _.guid()),
			itemKeys: _.times(CONFIG.GAME_RULES.SHOP_ITEM_KEYS, () => _.guid())
		}
	}

	function createExpiryAndSecondsLeft(source) {
		if(!source) return null;
		const results = source.toJSON ? source.toJSON() : _.clone(source);
		const date = moment(source._dateGenerated);

		results.dateExpires = date.clone().add(0.5, 'minutes');
		results.secondsLeft = results.dateExpires.diff(moment(), "seconds");
		return results;
	}

	function verifyPremiumData(shopSession) {
		var g = shopSession.global;
		var p = shopSession.premium;

		//Check if the user still falls under the valid PREMIUM period:
		if(p && p.secondsLeft > 0) {
			p.isPremiumValid = true;
			g.itemKeys = p.itemKeys = g._premiumKeys;
		}
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

				initShopList(req, res)
					.then(() => {
						var globalData = createExpiryAndSecondsLeft(globalSeed);
						var premiumData = createExpiryAndSecondsLeft(shopInfo.premium);

						req.shopSession = {global: globalData, premium: premiumData};

						verifyPremiumData(req.shopSession);

						next();
					})
					.catch(err => $$$.send.error(res, "Could not initialize the Shop collection!"));

				//next();
			},

			'seed'(Model, req, res, next, opts) {
				if(!isInited) return $$$.send.error(res, 'SHOP NOT INITIALIZED!');

				const user = req.auth.user;
				const shopSession = req.shopSession;
				const result = _.extend({}, shopSession.global);
				const premium = shopSession.premium;
				var lastPromise = Promise.resolve('ok');

				if(req.method==='POST') {
					if(premium && premium.secondsLeft>0) {
						return $$$.send.error(res, "Still have time remaining on User's current premium purchase: " + premiumData.secondsLeft);
					}

					const userPremiumPermit = user.game.shopInfo.premium;

					userPremiumPermit.guid = _.guid();
					userPremiumPermit.seed = (Math.random() * 2000000000) | 0;
					userPremiumPermit._dateGenerated = new Date();

					lastPromise = user.save();

					shopSession.premium = createExpiryAndSecondsLeft(userPremiumPermit);
					result.isPremiumPurchased = true;

					verifyPremiumData(req.shopSession);
				}

				const queryDates = [globalSeed];

				if(premium && premium.secondsLeft>0) {
					_.extend(result, premium);
					queryDates.push(premium);
				} else {
					queryDates.push(Promise.resolve([]));
				}

				const queryPromises = queryDates.map(seedObj => {
					return Model.find({
						userId: user.id,
						dateCreated: {$gte: seedObj._dateGenerated},
						'game.guid': seedObj.guid
					});
				});

				queryPromises.push(lastPromise);

				Promise.all(queryPromises)
					.then( multiResults => {
						const merged = multiResults[0].concat( multiResults[1] );
						const uniq = _.uniq(merged, 'id');

						result.recentPurchases = uniq.map(item => item.game.item.guid);

						mgHelpers.sendFilteredResult(res, result);
					})
					.catch(err => $$$.send.error(res, 'Could not get recently purchased items!', err.message));

			},

			'buy/*'(Model, req, res, next, opts) {
				if(mgHelpers.isWrongVerb(req, 'POST')) return;
				if(!opts.data) return $$$.send.error(res, "Missing POST data in /buy/item");

				next();
			},

			// 'buy/seed'(Model, req, res, next, opts) {
			// 	const user = req.auth.user;
			//
			// },

			'buy/item'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const shopSession = req.shopSession;
				const guid = opts.data.guid;
				const item = opts.data.item;
				const isPremium = guid===shopSession.premium.guid;
				const isGlobal = guid===shopSession.global.guid;
				const wantsPremium = item.isPremium===true;

				_.prom(() => {
					if(!isGlobal && !isPremium) {
						throw 'Wrong seed-GUID provided, needs to match global OR premium seed.';
					}

					if(wantsPremium && !isPremium) {
						throw 'Looks like you wanted a Premium item, but given seed GUID is for Global list.';
					}

					const validKeys = lastItemKeys.concat( globalSeed.itemKeys );

					if(!item || !item.guid) throw 'Missing item GUID to complete purchase!';
					if(!validKeys.has(item.guid)) throw 'Invalid GUID key! Has it expired? ' + guid;
					if(!item.identify) throw 'Must provide an item.identity field!';
					if(!item.name) throw 'Must provide an item.name field!';

					//Check to make sure there is no other item with the current GUID:
					return Model.find({userId: user.id, 'game.item.guid': item.guid});
				})
					.then( existingItem => {
						if(existingItem && existingItem.length) {
							throw 'Already own an item with same GUID: ' + item.guid;
						}

						const shopItem = new Model();
						shopItem.userId = user.id;

						const game = shopItem.game;
						game.isPremium = isPremium;
						game.guid = guid;
						game.seed = isPremium ? shopSession.premium.seed : shopSession.global.seed;
						game.item = {
							guid: item.guid,
							identify: item.identify,
							name: item.name
						};

						return shopItem.save();
					})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch( err => {
						trace(item);
						trace(shopSession);
						$$$.send.error(res, "Could not buy item: " + (err.message || err));
					});
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
				isPremium: {type:Boolean, default:false},

				guid: CustomTypes.String128(),
				seed: CustomTypes.LargeInt({min: -1, default: -1, required: true}),
				_dateGenerated: CustomTypes.DateRequired({default: new Date(0)}),

				item: {
					guid: CustomTypes.String128({required: true}),
					identify: CustomTypes.String32({required: true}),
					name: CustomTypes.String32({required: true})
				}
			}
		}
	};
};