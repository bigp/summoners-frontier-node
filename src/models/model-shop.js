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

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
	});

	// var timer = new $$$.Timer(1000, () => { // 60
	// 	//trace("loop...");
	// 	lastItemKeys = globalSeed.itemKeys || [];
	// 	globalSeed = {
	// 		guid: _.guid(),
	// 		seed: (Math.random() * 2000000000) | 0,
	// 		_dateGenerated: new Date(),
	// 		_premiumKeys: _.times(CONFIG.GAME_RULES.SHOP_ITEM_KEYS, () => _.guid()),
	// 		itemKeys: _.times(CONFIG.GAME_RULES.SHOP_ITEM_KEYS, () => _.guid())
	// 	}
	// });

	function createExpiryAndSecondsLeft(source) {
		if(!source) return null;
		const results = source.toJSON ? source.toJSON() : _.clone(source);
		const date = moment(source._dateGenerated);
		const expires = date.clone().add(1, 'hour');

		results.dateExpires = expires.toDate();
		results.secondsLeft = expires.diff(moment(), "seconds");
		return results;
	}

	function refreshUserKey(req) {
		const user = req.auth.user;
		const refreshKey = user.game.shopInfo.refreshKey;
		refreshKey._dateGenerated = moment().startOf('hour');
		req.shopSession.refreshKey = createExpiryAndSecondsLeft(refreshKey);

		return user.save();
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
				req.shopSession = {
					refreshKey: refreshKey
				};

				if(refreshKey.secondsLeft < 0) {
					return refreshUserKey(req).then(next);
				}

				next();
			},

			'key$/'(Model, req, res, next, opts) {
				if(mgHelpers.isWrongVerb(req, 'GET')) return;

				mgHelpers.sendFilteredResult(res, req.shopSession);
			},

			'key/refresh'(Model, req, res, next, opts) {
				if(mgHelpers.isWrongVerb(req, 'PUT')) return;

				refreshUserKey(req)
					.then(savedUser => {
						var results = _.extend({isRefreshed: true}, req.shopSession);
						mgHelpers.sendFilteredResult(res, results);
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
				guid: CustomTypes.String128(),
				seed: CustomTypes.LargeInt({min: -1, default: -1, required: true}),
				_dateGenerated: CustomTypes.DateRequired({default: new Date(0)}),

				item: {
					index: CustomTypes.String128({required: true}),
					seed: CustomTypes.String32({required: true}),
				}
			}
		}
	};
};