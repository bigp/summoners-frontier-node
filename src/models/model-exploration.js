/**
 * Created by Chamberlain on 9/8/2017.
 */
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
const GAME_RULES = CONFIG.GAME_RULES;
const moment = require('moment');

module.exports = function() {
	var User, Shop, Item, Hero, LootCrate, Exploration;

	/**
	 * Delay the models constants
	 *
	 * (because the for-loop iterating these model-files may not be
	 * aware at this instant of all $$$.models until the next cycle)
	 */
	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;
		LootCrate = $$$.models.Lootcrate;
		Exploration = $$$.models.Exploration;
	});

	function findValidExploration(user, actZoneID) {
		return _.promise(() => {
			const jsonActZones = gameHelpers.getActZones();

			if(!jsonActZones.actZoneIDs.has(actZoneID)) {
				throw 'Invalid ActZone, cannot create -or- update Exploration: ' + actZoneID;
			}

			return Exploration.find({userId: user.id, 'game.actZoneID': actZoneID})
		});
	}

	return {
		plural: 'explorations',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			':actZoneID'(Model, req, res, next, opts) {
				const actZoneID = req.params.actZoneID | 0;
				if(isNaN(actZoneID) || actZoneID<=0) return next();

				const user = req.auth.user;

				findValidExploration(user, actZoneID)
					.then( found => {
						if(found) {
							if(found.length>1) {
								throw 'User has many exploration of the same ActZoneID! ' + actZoneID;
							}

							if(found.length===1) {
								req.validActZone = found[0];
								return next();
							}
						}

						const isAutoCreate = opts.data.isAutoCreate;

						if(isAutoCreate) {
							var exploreInst = new Model();
							exploreInst.userId = user.id;
							_.extend(exploreInst.game, {actZoneID: actZoneID});

							return exploreInst.save().then( saved => {
								req.validActZone = saved;
								next();
							});
						}

						//traceError(`An Exploration of '${actZoneID}' already exists!`);
						//trace("Left the Exploration as null!".yellow);
						throw `Cannot find Exploration #${actZoneID}, did you forgot to add "isAutoCreate" to the JSON request body?`;
						//next();
					})
					.catch( err => {
						$$$.send.error(res, (err.message || err))
					});
			},

			':actZoneID$'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validActZone = req.validActZone;
				if(!validActZone) return next();

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					mgHelpers.sendFilteredResult(res, validActZone);
				})
					.catch( err => {
						$$$.send.error(res, (err.message || err));
					})
			},

			':actZoneID/start'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validActZone = req.validActZone;
				const exploreData = opts.data.exploration;
				const party = opts.data.party;
				const actZoneID = req.params.actZoneID | 0;
				const q = {userId: user.id}; //id: {$in: party}
				const results = {};

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'POST')) return;
					if(!validActZone || !validActZone.game || actZoneID<1) {
						throw	'Invalid ExploreData, it may be missing a valid ActZoneID: ' + JSON.stringify(exploreData);
					}

					if(!exploreData.dateStarted) {
						throw	'Missing "dateStarted" field in POST data.';
					}

					if(!party || !_.isArray(party) || party.length===0) {
						throw	'Missing valid party information. '+
								'Make sure to supply an array of 1 or more valid Hero IDs.';
					}

					return Hero.find(_.merge(q, {'game.exploringActZone': 0}));
				})
					.then( heroes => {
						var heroesInParty = heroes.filter(hero => party.has(hero.id));
						heroes = _.sortBy(heroes, 'id');
						heroesInParty = _.sortBy(heroesInParty, 'id');

						if(!heroesInParty || heroesInParty.length !== party.length) {
							const heroIDs = heroes.map(h => h.id);
							const heroInPartyIDs = heroesInParty.map(h => h.id);
							throw [
								'Not all Hero IDs provided match those the User has currently available:',
								'User Heroes: ' + heroIDs.sortNumeric(),
								'User Matching: ' + heroInPartyIDs.sortNumeric(),
								'Party IDs: ' + party.sortNumeric()
								].join('\n');
						}

						heroesInParty.forEach(h => h.game.exploringActZone = actZoneID);

						results.heroes = heroesInParty;

						const qInParty = _.merge(q, {id: {$in: party}});
						
						return Hero.updateMany(qInParty, {'game.exploringActZone': actZoneID});
					})
					.then( heroesUpdated => {
						results.numFound = heroesUpdated.n;
						results.numModified = heroesUpdated.nModified;

						validActZone.game.dateStarted = exploreData.dateStarted;

						return validActZone.save();
					})
					.then( saved => {
						results.exploration = saved;

						//trace("Alright, add / update the exploration now");
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, (err.message || err)));
			},

			':actZoneID/update'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const exploreData = opts.data.exploration;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;
					if(!req.validActZone) throw 'Invalid ActZone (do you need to use isAutoCreate?)';
					if(!exploreData) throw 'Missing "exploration" in POST data.';
					if(mgHelpers.hasMissingFields(exploreData, 'accumulativeDamage,chests,dateStarted')) return;

					_.extend(req.validActZone.game, exploreData);

					return req.validActZone.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch( err => $$$.send.error(res, (err.message || err)));
			},

			':actZoneID/complete'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const actZoneID = req.params.actZoneID | 0;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'DELETE')) return;
					if(isNaN(actZoneID) || actZoneID<=0) throw 'Invalid Exploration ID, cannot remove it.';

					return Model.remove({userId: user.id, id: actZoneID});
				})
					.then( removed => {
						const results = removed.toJSON();
						if(results.n<=0) throw `Could not remove Exploration ID#${actZoneID} - either doesn't exist or belongs to another user.`;

						mgHelpers.sendFilteredResult(res, {
							isRemoved: true,
							numRemoved: results.n
						});
					})
					.catch( err => $$$.send.error(res, (err.message || err)));
			},

			'list/'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					return Model.find({userId: user.id});
				})
					.then( results => {
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch( err => $$$.send.error(res, (err.message || err)));

			},
		},

		methods: {},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				dateStarted: CustomTypes.DateRequired(),
				accumulativeDamage: CustomTypes.LargeInt({required: true, default: 0}),
				chests: CustomTypes.Int({required: true, default: 0}),
				actZoneID: CustomTypes.Int({required:true, min: -1, default: -1}),
				//isCompleted: {type: Boolean, default: false},
				//dateLastVisited: CustomTypes.DateRequired(),
			}
		}
	};
};