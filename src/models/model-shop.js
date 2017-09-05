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
	var globalSeed, isInited = false;
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
			resolve();
		});
	}

	function startLoop() {
		stopLoop();
		_interval = setInterval( loop, 1000 );
	}

	function stopLoop() {
		if(_interval<0) return;

		clearInterval( _interval);
		_interval = -1;
	}

	function loop() {
		globalSeed = {
			seed: (Math.random() * 2000000000) | 0,
			dateGenerated: moment()
		}
	}

	return {
		plural: 'shop',
		whitelist: ['game.identity', 'game.items'],
		blacklistVerbs: "GET_ONE GET_MANY POST_ONE POST_MANY DELETE_ONE DELETE_MANY PUT_ONE PUT_MANY".split(' '),

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'*'(Model, req, res, next, opts) {
				// const user = req.auth.user;
				// const rng = user.getRNG("shopRefreshes");
				//
				// req.rng = rng;

				initShopList(req, res)
					.then(next)
					.catch(err => $$$.send.error(res, "Could not initialize the Shop collection!"));

				//next();
			},

			'seed'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const result = {};

				Model.find({userId: user.id}).sort({dateCreated: -1}).limit(1)
					.then( results => {
						if(!results || !results.length) {
							result.seed = globalSeed;
							result.dateExpires = globalSeed.dateGenerated

							return mgHelpers.sendFilteredResult(res, result);
						}
						mgHelpers.sendFilteredResult(res, {randomSeed: 'premium-based'});
					});

				//const numItems = isNaN(req.params.numItems) ? 10 : (req.params.numItems | 0);
				// const shopItemsFixed = req.shopItemsFixed;
				//
				// mgHelpers.sendFilteredResult(res, [{ok: 1}]);
				//
				// return;
				//
				// user.setRNG("shopRefreshes", req.rng._seed + 1)
				// 	.then(updated => {
				// 		// updated
				// 	});


				// Model.
				// 	.then(items => {
				// 		mgHelpers.sendFilteredResult(res, items);
				// 	})
				// 	.catch(err => {
				// 		$$$.send.error(res, "Could not get list of heroes for user ID: " + req.auth.user.id, err);
				// 	})
			},

			'buy-seed'(Model, req, res, next, opts) {
				if(mgHelpers.isWrongVerb(req, 'POST')) return;

				var shopItem = new Model();
				shopItem.userId = req.auth.user.id;
				shopItem.game.premiumSeed = (Math.random() * 2000000000) | 0;
				shopItem.game.datePurchased = new Date();

				shopItem.save()
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
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
				premiumSeed: {},
				datePurchased: CustomTypes.DateRequired(),

				//randomSeed: {},

				// identity: CustomTypes.String128({required:true, unique: 'Shop items must be uniquely named!'}),
				// itemDataIdentity: CustomTypes.String128({required:true}),
				// quantity: CustomTypes.Int({max: 10000}),
				// isPremium: {type: Boolean, default: false},
				// isIdentified: {type: Boolean, default: false},
				// numPurchased: CustomTypes.LargeInt(),
			}
		}
	};
};