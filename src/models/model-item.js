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
		plural: 'items',
		whitelist: ['user', 'dateCreated', 'game.identity', 'game.heroEquipped'],
		blacklistVerbs: "GET_ONE GET_MANY POST_ONE POST_MANY DELETE_ONE DELETE_MANY".split(' '),

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'random/:type/:count?'(Model, req, res, next, opts) {

				const jsonItems = gameHelpers.getItems();
				if(!jsonItems) return $$$.send.error(res, "JSON items not loaded yet.");
				if(!jsonItems[req.params.type]) {
					return $$$.send.error(res, "Wrong item type specified, not defined in JSON item categories.");
				}

				mgHelpers.prepareRandomCountRequest(Model, req, res, next, generateItem)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, "Could not create items!", err);
					});

				function generateItem(user) {
					const jsonItem = jsonItems[req.params.type].pickRandom();
					const itemData = _.clone(opts.data);
					itemData.userId = user.id;

					const gameData = itemData.game = {};
					gameData.identity = jsonItem.identity;
					gameData.randomSeed = (Math.random() * 100) | 0;
					gameData.isEquipped = false;
					//gameData.heroEquipped = '';

					return itemData;
				}
			},

			'list'(Model, req, res, next, opts) {
				mgHelpers.findAllByCurrentUser(Model, req, res, next, opts)
					.catch(err => {
						$$$.send.error(res, "Could not get list of items for user ID: " + req.auth.user.id, err);
					})
			},

			'add'(Model, req, res, next, opts) {
				mgHelpers.prepareAddRequest(Model, req, res, next, opts)
					.then( user => {
						const jsonItems = gameHelpers.getItems();
						const validIdentities = jsonItems.all.identities;

						var invalidIdentities = [];
						const items = opts.data.list.map(item => {
							if(!validIdentities.has(item.identity)) {
								invalidIdentities.push(item);
							}

							return { userId: user.id, game: item };
						});

						if(invalidIdentities.length) {
							throw "Some of the supplied items are invalid: " +
								invalidIdentities.map(n => n.identity).join(', ');
						}

						function promiseAddItems(oldest) {
							return Model.create(items)
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
						$$$.send.error(res, "Could not add items!", err);
					});
			}
		},

		methods: {

			// createToken() { return ''; },
		},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.Number({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				identity: CustomTypes.String128({required:true}),
				randomSeed: CustomTypes.Number({required:true}),
				heroEquipped: CustomTypes.Number({default: 0}),
			}
		}
	};
};