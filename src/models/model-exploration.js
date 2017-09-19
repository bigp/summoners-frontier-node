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

module.exports = function() {
	const GAME_RULES = CONFIG.GAME_RULES;
	const moment = require('moment');

	var User, Shop, Item, LootCrate, Exploration;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
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
		})
	}

	return {
		plural: 'explorations',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			':actZoneID/*'(Model, req, res, next, opts) {
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
						trace("Left the Exploration as null!".yellow);
						throw 'Must provide an "isAutoCreate" bool in JSON.';
						//next();
					})
					.catch( err => $$$.send.error(res, (err.message || err)));
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

			'complete/:actZoneID'(Model, req, res, next, opts) {
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
			}
		},

		methods: {},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				dateStarted: CustomTypes.DateRequired(),
				//isCompleted: {type: Boolean, default: false},
				//dateLastVisited: CustomTypes.DateRequired(),
				accumulativeDamage: CustomTypes.LargeInt({required: true, default: 0}),
				chests: CustomTypes.Int({required: true, default: 0}),
				actZoneID: CustomTypes.Int({required:true, min: -1, default: -1}),
			}
		}
	};
};