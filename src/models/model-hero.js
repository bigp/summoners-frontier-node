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
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
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
							throw "Some of the supplied hero identities don't exists in game's JSON: " +
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

			':heroID/*'(Model, req, res, next, opts) {
				const heroID = req.params.heroID;
				const user = req.auth.user;

				$$$.models.Hero.find({userId: req.auth.user.id, id: heroID}).limit(1)
					.then( validHero => {
						if(!validHero.length) throw 'Invalid hero ID';
						req.validHero = validHero[0];
						req.opts = opts;

						next(); //Pass this down to next route actions:
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/equip/:itemID'(Model, req, res, next, opts) {
				if(!req.auth || !req.auth.user || !req.validHero) return $$$.send.errorSkippedRoute(res);

				const itemID = req.params.itemID;
				const user = req.auth.user;

				$$$.models.Item.find({userId: user.id, id: itemID}).limit(1)
					.then( validItem => {
						if(!validItem.length) throw 'Invalid item ID';
						req.previousHeroID = validItem[0].game.heroEquipped;
						req.validItem = validItem[0];
						req.validItem.game.heroEquipped = req.validHero.id;

						return req.validItem.save();
					})
					.then(validItem => {
						mgHelpers.sendFilteredResult(res, {
							previousHeroID: req.previousHeroID,
							item: validItem
						});
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/remove'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const Item = $$$.models.Item;
				const results = {heroID: req.validHero.id};

				return new Promise((resolve, reject) => {
					if(mgHelpers.isWrongVerb(req, res, 'DELETE')) return;

					const q = {userId: user.id, 'game.heroEquipped': req.validHero.id};
					const $set = {$set: {'game.heroEquipped': 0}};

					resolve( Item.updateMany(q, $set) )
				})
					.then( items => {
						results.numItemsAffected = items.nModified;

						return Model.remove({userId: user.id, id: req.validHero.id});
					})
					.then( removed => {
						results.numRemoved = removed.toJSON().n;
						results.game = req.validHero.game.toJSON();

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'remove-all'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const Item = $$$.models.Item;
				const results = {};

				return new Promise((resolve, reject) => {
					if(mgHelpers.isWrongVerb(req, res, 'DELETE')) return;

					const q = {userId: user.id};
					const $set = {$set: {'game.heroEquipped': 0}};

					resolve( Item.updateMany(q, $set) )
				})
					.then( items => {
						trace(items);
						results.numItemsAffected = items.nModified;
						return Model.remove({userId: user.id});
					})
					.then( removed => {
						results.numRemoved = removed.toJSON().n;
						trace(results);

						mgHelpers.sendFilteredResult(res, results);
					})
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
			userId: CustomTypes.LargeInt(),
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
			}
		}
	};
};