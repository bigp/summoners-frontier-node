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
		whitelist: ['user', 'dateCreated', 'game.itemIdentity', 'game.heroEquipped'],
		blacklistVerbs: "GET_ONE GET_MANY POST_ONE POST_MANY DELETE_ONE DELETE_MANY".split(' '),

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'random'(Model, req, res, next, opts) {
				mgHelpers.authenticateUser(req, res, next)
					.then( user => {
						if(mgHelpers.isWrongVerb(req, res, 'POST')) return;

						const jsonHeroes = gameHelpers.getHeroes();
						if(!jsonHeroes) return $$$.send.error(res, "JSON heroes not loaded yet.");

						const jsonItem = jsonHeroes.pickRandom();
						const heroData = opts.data;
						heroData.userId = user.id;

						const gameData = heroData.game = {};
						gameData.itemIdentity = jsonItem.identity;
						gameData.randomSeed = (Math.random() * 100) | 0;
						gameData.isEquipped = false;
						//gameData.heroEquipped = '';

						//This overrides the $or queries in the next function call:
						opts.noQuery = true;

						Model.httpVerbs['POST_ONE'](req, res, next, opts);
					});
			},

			'list'(Model, req, res, next, opts) {
				mgHelpers.authenticateUser(req, res, next)
					.then( user => {
						if(mgHelpers.isWrongVerb(req, res, 'GET')) return;

						Model.find({userId: user.id})
							.then(items => {
								mgHelpers.sendFilteredResult(res, items);
							})
							.catch(err => {
								$$$.send.error(res, "Could not get list of items for user ID: " + user.id);
							})
						//Model.httpVerbs['GET_MANY'](req, res, next, opts);
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
				heroIdentity: CustomTypes.String128({required:true}),
				randomSeed: CustomTypes.Number(),
				isExploring: Boolean,
				items: {
					helm: {type: ObjectId, ref: 'item'},
					chest: {type: ObjectId, ref: 'item'},
					gloves: {type: ObjectId, ref: 'item'},
					boots: {type: ObjectId, ref: 'item'},
					relic: {type: ObjectId, ref: 'item'},
					weapon: {type: ObjectId, ref: 'item'},
				}
			}
		}
	};
};