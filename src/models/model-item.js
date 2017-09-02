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
					gameData.isEquipped = false;
					gameData.randomSeeds = {
						quality: $$$.randInt(),
						affix: $$$.randInt(),
						itemLevel: $$$.randInt(),
						variance: $$$.randInt(),
						magicFind: $$$.randInt()
					};
					//gameData.heroEquipped = '';

					return itemData;
				}


			},

			'list$'(Model, req, res, next, opts) {
				mgHelpers.findAllByCurrentUser(Model, req, res, next, opts)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, "Could not get list of items for user ID: " + req.auth.user.id, err);
					})
			},

			'equipped-off$'(Model, req, res, next, opts) {
				opts.query = {'game.heroEquipped': 0};

				mgHelpers.findAllByCurrentUser(Model, req, res, next, opts)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, "Could not get list of items for user ID: " + req.auth.user.id, err.message);
					})
			},

			'equipped-on/:heroID?'(Model, req, res, next, opts) {
				const heroID = req.params.heroID;
				if(isNaN(heroID) || heroID < 1) {
					return $$$.send.error(res, "Must provide a Hero ID greater-than ZERO (0). Want unequipped items? Use /item/equipped-off instead.");
				}

				opts.query = {'game.heroEquipped': heroID};

				mgHelpers.findAllByCurrentUser(Model, req, res, next, opts)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, "Could not get list of items for user ID: " + req.auth.user.id, err.message);
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
							throw "Some of the supplied item identities don't exists in game's JSON: " +
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

		methods: { /* createToken() { return ''; }, */ },

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				identity: CustomTypes.String128({required:true}),
				heroEquipped: CustomTypes.LargeInt({default: 0, index: true}),
				randomSeeds: {
					quality: CustomTypes.LargeInt({default: 1}),
					affix: CustomTypes.LargeInt({default: 1}),
					itemLevel: CustomTypes.LargeInt({default: 1}),
					variance: CustomTypes.LargeInt({default: 1}),
					magicFind: CustomTypes.Number({default: 1})
				},
			}
		}
	};
};