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

module.exports = function() {
	return {
		plural: 'heros',

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
					gameData.skills = [1,1,1].map(s => ({ level: s }));
					return heroData;
				}
			},

			'list$/'(Model, req, res, next, opts) {
				mgHelpers.getAllByCurrentUser(Model, req, res, next, opts)
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
						$$$.send.error(res, "Could not list available heroes!", err);
					})
			},

			'add'(Model, req, res, next, opts) {
				mgHelpers.prepareAddRequest(Model, req, res, next, opts)
					.then( user => {
						const jsonHeroes = gameHelpers.getHeroes();
						const validIdentities = jsonHeroes.all.identities;

						var invalidIdentities = [];
						const heroes = opts.data.list.map(game => {
							if(!validIdentities.has(game.identity)) {
								invalidIdentities.push(game);
							}

							return {
								userId: user.id,
								game: game
							};
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

				Model.find({userId: user.id, id: heroID}).limit(1)
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
						$$$.send.error(res, err);
					})
			},

			':heroID/exploring/:actZone'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				const actZone = req.params.actZone;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(res, 'PUT')) return;
					if(isNaN(actZone) || actZone < 1) throw 'Invalid actZone specified: ' + actZone;

					validHero.game.exploringActZone = actZone;
					return validHero.save();
				})
					.then(saved => {
						trace(saved);
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/tap-ability'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				var dateTapped = opts.data.dateTapped;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;
					if(!dateTapped) throw 'Missing param "dateTapped"!';

					if(_.isString(dateTapped)) {
						dateTapped = moment(dateTapped);
					}

					validHero.game.dateLastUsedTapAbility = dateTapped;
					return validHero.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/skill-levels'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				const skillLevels = opts.data.skillLevels;

				_.promise(() => {
					if (mgHelpers.isWrongVerb(req, 'PUT')) return;

					validHero.game.skills = skillLevels;

					return validHero.save();
				})
					.then( saved => {
						trace(saved);
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/rename'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				const customName = opts.data.customName;

				_.promise(() => {
					if (mgHelpers.isWrongVerb(req, 'PUT')) return;

					validHero.game.customName = customName;

					return validHero.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
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
					//TODO don't forget to set explorations to 0 too! (if they also refer to the Heroes)
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

			'reset-exploration'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;

					return Model.updateMany({
						userId: user.id
					}, {
						// Reset heroes to zero (0)
						'game.exploringActZone': 0
					});
				})
					.then( updated => {
						mgHelpers.sendFilteredResult(res, updated);
					})
					.catch( err => $$$.send.error(res, err));
			}
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
				customName: CustomTypes.StringCustom(24),
				xp: CustomTypes.LargeInt({required: true, default: 0}),
				identity: CustomTypes.String128({required:true}),
				exploringActZone: CustomTypes.Int({required:true, default: 0}),
				dateLastUsedTapAbility: CustomTypes.DateRequired(),
				randomSeeds: {
					variance: CustomTypes.LargeInt({default: 1}),
				},
				skills: [
					new Schema({
						identity: CustomTypes.String32(),
						level: CustomTypes.Int({required: true, default: 0})
					}, {_id: false})
				]
			}
		}
	};
};