/**
 * Created by Chamberlain on 8/29/2017.
 */

const gameHelpers = require('../sv-game-helpers');
const mgHelpers = require('../sv-mongo-helpers');
const mongoose = mgHelpers.mongoose;
const Schema  = mongoose.Schema;
const Types  = Schema.Types;
const CustomTypes  = mongoose.CustomTypes;
const ObjectId = Types.ObjectId;
const CONFIG = $$$.env.ini;

module.exports = function() {
	return {
		plural: 'items',
		whitelist: ['user', 'dateCreated', 'game.itemIdentity', 'game.heroEquipped'],
		blacklistVerbs: "GET_ONE GET_MANY POST_ONE POST_MANY DELETE_ONE DELETE_MANY".split(' '),

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'random/:type'(Model, req, res, next, opts) {
				mgHelpers.authenticateUser(req, res, next)
					.then( user => {
						if(mgHelpers.isWrongVerb(req, res, 'POST')) return;
						const jsonItems = gameHelpers.getJSONItems();
						if(!jsonItems) return $$$.send.error(res, "JSON items not loaded yet.");

						const jsonItem = jsonItems[req.params.type].pickRandom();
						const itemData = opts.data;
						itemData.userId = user.id;

						const gameData = itemData.game = {};
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
				itemIdentity: CustomTypes.String128({required:true}),
				randomSeed: CustomTypes.Number(),
				isEquipped: Boolean,
				heroEquipped: {type: ObjectId, ref: 'hero'},
			}
		}
	};
};