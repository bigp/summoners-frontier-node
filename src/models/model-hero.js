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
	return {
		plural: 'heros',
		whitelist: ['user', 'dateCreated', 'game.identity', 'game.items'],
		blacklistVerbs: "GET_ONE GET_MANY POST_ONE POST_MANY DELETE_ONE DELETE_MANY".split(' '),

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'random/:count?'(Model, req, res, next, opts) {
				const jsonHeroes = gameHelpers.getHeroes();
				if(!jsonHeroes) return $$$.send.error(res, "JSON heroes not loaded yet.");

				mgHelpers.prepareRandomCountRequest(Model, req, res, next, generateHero)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, "Could not create items!", err);
					});

				function generateHero(user) {
					var heroJSON = jsonHeroes.pickRandom();
					var heroData = _.clone(opts.data);
					heroData.userId = user.id;

					var gameData = heroData.game = {};
					gameData.identity = heroJSON.identity;
					gameData.randomSeed = (Math.random() * 100) | 0;

					return heroData;
				}
			},

			'list'(Model, req, res, next, opts) {
				mgHelpers.findAllByCurrentUser(Model, req, res, next, opts)
					.catch(err => {
						$$$.send.error(res, "Could not get list of heroes for user ID: " + req.auth.user.id, err);
					})
			},

			'add'(Model, req, res, next, opts) {
				mgHelpers.prepareAddRequest(Model, req, res, next, opts)
					.then( user => {
						const jsonHeroes = gameHelpers.getHeroes();
						const validIdentities = jsonHeroes.all.identities;

						var invalidIdentities = [];
						const heroes = opts.data.list.map(item => {
							if(!validIdentities.has(item.identity)) {
								invalidIdentities.push(item);
							}

							return { userId: user.id, game: item };
						});

						if(invalidIdentities.length) {
							throw "Some of the supplied heroes are invalid: " +
								invalidIdentities.map(n => n.identity).join(', ');
						}

						function promiseAddItems(oldest) {
							return Model.create(heroes)
								.then(newest => {
									mgHelpers.sendNewestAndOldest(res, newest, oldest);
								});
						}

						//This 'showAll' option allows to include a 'itemsOld' entry in the results:
						if(_.isTruthy(opts.data.showAll)) {
							return Model.find({userId: user.id}).exec()
								.then(promiseAddItems);
						}

						return promiseAddItems();
					})
					.catch(err => {
						$$$.send.error(res, "Could not add heroes!", err);
					});
			},

			':heroID/equip/:itemID'(Model, req, res, next, opts) {
				const heroID = req.params.heroID;
				const itemID = req.params.itemID;

				mgHelpers.authenticateUser(req, res, next)
					///////////////////////// VALIDATE That the user actually owns the specified hero & item:
					.then(user => {

						//Check that this user actually owns the given IDs:
						return $$$.models.Hero.find({userId: req.auth.user.id, id: heroID}).limit(1);
					})
					.then( validHero => {
						if(!validHero.length) throw 'Invalid hero ID';
						req.validHero = validHero[0];

						return $$$.models.Item.find({userId: req.auth.user.id, id: itemID}).limit(1);
					})
					.then( validItem => {
						if(!validItem.length) throw 'Invalid item ID';
						req.validItem = validItem[0];

						return req;
					})

					///////////////////////// OK, now check where the item fits in the Hero's equipment slots:
					.then(req => {
						req.previousHeroID = req.validItem.game.heroEquipped;
						req.validItem.game.heroEquipped = heroID;

						return req.validItem.save();
					})
					.then(validItem => {
						mgHelpers.sendFilteredResult(res, {
							previousHeroID: req.previousHeroID,
							item: validItem
						});
					})
					// 	const jsonItems = gameHelpers.getItems();
					// 	const jsonAllItems = jsonItems.all.items;
					// 	const itemIdentity = req.validItem.game.identity;
					// 	const itemLookup = jsonAllItems.find(item => item.identity === itemIdentity);
					// 	const equipType = itemLookup['equipment-type'];
					//
					// 	var itemClass = "weapon";
					// 	if(equipType) {
					// 		itemClass = equipType.toLowerCase();
					// 	}
					//
					// 	const isItemAlreadyEquipped = req.validItem.game.heroEquipped > 0;
					// 	const isHeroAlreadyEquipped = req.validHero.game.items[itemClass] > 0;
					//
					// 	if(isItemAlreadyEquipped || isHeroAlreadyEquipped) {
					// 		return $$$.send.result(res, {ok: -1});
					// 	} else {
					// 		req.validItem.game.heroEquipped = heroID;
					// 		req.validHero.game.items[itemClass] = itemID;
					//
					// 		return Promise.all([
					// 			req.validItem.save(),
					// 			req.validHero.save(),
					// 		]);
					// 	}
					// })
					// .then( results => {
					// 	//trace(results);
					// 	mgHelpers.sendFilteredResult(res, {
					// 		item: results[0],
					// 		hero: results[1]
					// 	});
					// })
					.catch(err => {
						$$$.send.error(res, err);
					});
			}
		},

		methods: {

			// createToken() { return ''; },
		},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.Number(),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				identity: CustomTypes.String128({required:true}),
				isExploring: {type: Boolean, default: false},
				randomSeeds: {
					variance: CustomTypes.LargeInt({default: 1}),
				},

				//TODO: THINK ABOUT CACHING THESE!!! (when we hit the 1M items / heroes)
				// items: [
				// 	{
				// 		item:
				// 	}
				// ]

				// items: {
				// 	helm: CustomTypes.Number({default: 0}),
				// 	chest: CustomTypes.Number({default: 0}),
				// 	gloves: CustomTypes.Number({default: 0}),
				// 	boots: CustomTypes.Number({default: 0}),
				// 	relic: CustomTypes.Number({default: 0}),
				// 	weapon: CustomTypes.Number({default: 0}),
				// }
			}
		}
	};
};