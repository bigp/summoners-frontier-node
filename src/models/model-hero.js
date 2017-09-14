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
		whitelist: [''], //user', 'dateCreated', 'game.identity', 'game.items
		blacklistVerbs: "GET_ONE GET_MANY POST_ONE POST_MANY DELETE_ONE DELETE_MANY PUT_ONE PUT_MANY".split(' '),

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

			'list$/'(Model, req, res, next, opts) {
				mgHelpers.findAllByCurrentUser(Model, req, res, next, opts)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, "Could not get list of heroes for user ID: " + req.auth.user.id, err);
					})
			},

			'list/available'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					return Model.find({userId: user.id, 'game.exploringActZone': 0});
				})
					.then( heroes => {
						heroes = _.sortBy(heroes, 'id');
						mgHelpers.sendFilteredResult(res, heroes);
					})
					.catch( err => {
						$$$.send.error(res, "Could not list available heroes!", err.message || err);
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
									return mgHelpers.makeNewestAndOldest(newest, oldest);
								})
								.then(results => {
									mgHelpers.sendFilteredResult(res, results);
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

				if(isNaN(heroID)) return next();

				Model.find({userId: req.auth.user.id, id: heroID}).limit(1)
					.then( validHero => {
						if(!validHero.length) throw 'Invalid hero ID';
						req.validHero = validHero[0];

						next(); //Pass this down to next route actions:
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/xp'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;
					if(isNaN(opts.data.xp)) throw 'Missing "xp" field in POST data.';

					validHero.game.xp = opts.data.xp | 0;
					return validHero.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch( err => {
						$$$.send.error(res, err.message || err);
					})
			},

			':heroID/remove'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				const Item = $$$.models.Item;
				const results = {};

				mgHelpers.prepareRemoveRequest(req, {'game.heroEquipped': validHero.id})
					.then(q => {
						return Item.updateMany(q, {$set: {'game.heroEquipped': 0}});

					})
					.then( items => {
						results.numItemsAffected = items.nModified;

						return Model.remove({userId: user.id, id: validHero.id});
					})
					.then( removed => {
						results.removed = validHero.toJSON();

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

				mgHelpers.prepareRemoveRequest(req)
					.then(q => {
						return Item.updateMany(q, {$set: {'game.heroEquipped': 0}});
					})
					.then( items => {
						results.numItemsAffected = items.nModified;
						return Model.remove({userId: user.id});
					})
					.then( removed => {
						results.numRemoved = removed.toJSON().n;

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'tap-ability'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const heroDatas = opts.data.heroes;
				const heroIDs = heroDatas.map( h => h.id );

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;

					return Model.find({userId: user.id})
						.where('id')
						.in(heroIDs);
				})
					.then( heroes => {
						var promises = [];
						heroDatas.forEach( heroData => {
							var myHero = heroes.find( hero => hero.id == heroData.id);
							if(!myHero) return;

							myHero.game.dateLastUsedTapAbility = heroData.tapAbility;

							promises.push( myHero.save() );
						});

						return Promise.all(promises);
					})
					.then( updates => {
						updates = _.sortBy(updates, 'id');
						mgHelpers.sendFilteredResult(res, updates);
					})
					.catch( err => {
						$$$.send.error(res, err);
					});
			},

			//''
		},

		methods: {
			toDebugID() {
				return this.game.identity+"#" + this.id;
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt(),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				xp: CustomTypes.LargeInt({required: true, default: 0}),
				identity: CustomTypes.String128({required:true}),
				exploringActZone: CustomTypes.Int({required:true, default: 0}),
				dateLastUsedTapAbility: CustomTypes.DateRequired(),
				randomSeeds: {
					variance: CustomTypes.LargeInt({default: 1}),
				}
			}
		}
	};
};