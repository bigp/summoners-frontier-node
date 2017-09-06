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
		globalSeed = {
			guid: _.guid(),
			seed: (Math.random() * 2000000000) | 0,
			_dateGenerated: new Date()
		}
	}

	function createExpiryAndSecondsLeft(source) {
		if(!source) return null;
		const results = source.toJSON ? source.toJSON() : source;
		const date = moment(source._dateGenerated);

		results.dateExpires = date.clone().add(1, 'hour');
		results.secondsLeft = results.dateExpires.diff(moment(), "seconds");
		return results;
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
				var result = {};

				if(!globalSeed) return $$$.send.error(res, 'SHOP NOT INITIALIZED!');

				result.global = createExpiryAndSecondsLeft(globalSeed);

				const user = req.auth.user;
				const shopInfo = user.game.shopInfo;
				const premium = shopInfo.premium;
				const premiumData = createExpiryAndSecondsLeft(premium);
				const q = {userId: user.id};
				const qDates = [globalSeed._dateGenerated];

				if(premiumData && premiumData.secondsLeft>0) {
					result.premium = premiumData;
					qDates.push(premium._dateGenerated);
				}

				const queries = qDates.map(date => {
					return Model.find({userId: user.id, dateCreated: {$gte: date}});
				});

				Promise.all(queries)
					.then( oneOrBoth => {
						var uniq;

						if(oneOrBoth.length==1) uniq = oneOrBoth[0];
						else {
							const merged = oneOrBoth[0].concat( oneOrBoth[1] );
							uniq = _.uniq(merged, 'id');
						}

						result.recentPurchases = uniq;
						mgHelpers.sendFilteredResult(res, result);
					})
					.catch(err => $$$.send.error(res, 'Could not get recently purchased items!', err.message));

			},

			'buy-seed'(Model, req, res, next, opts) {
				if(mgHelpers.isWrongVerb(req, 'POST')) return;

				const user = req.auth.user;
				const shopInfo = user.game.shopInfo;
				const premium = shopInfo.premium;

				// const shopItem = new Model();
				// shopItem.userId = user.id;
				premium.guid = _.guid();
				premium.seed = (Math.random() * 2000000000) | 0;
				premium._dateGenerated = new Date();

				user.save()
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
			},

			'buy-item'(Model, req, res, next, opts) {
				if(mgHelpers.isWrongVerb(req, 'PUT')) return;

				mgHelpers.sendFilteredResult(res, {test: 'testing buy-item'});
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
				userPremium: {
					seed: CustomTypes.LargeInt({min: -1, default: -1, required: true}),
					datePurchased: CustomTypes.DateRequired(),
				},

				item: {
					id: CustomTypes.LargeInt({required: true}),
					name: CustomTypes.String32({required: true})
				}
			}
		}
	};
};