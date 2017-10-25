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
	var User, Shop, Item, Hero, MsgTemplate;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;
		MsgTemplate = $$$.models.MessageTemplate;
	});

	return {
		plural: 'messageReceipts',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'list$'(Model, req, res, next, opts) {
				$$$.send.notImplemented(res);
			},

			'add'(Model, req, res, next, opts) {
				$$$.send.notImplemented(res);
			},
		},

		methods: {
			toDebugID() {
				return this.game.identity + "#" + this.id;
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				msgTemplateID: CustomTypes.LargeInt(),
				sentFrom: CustomTypes.LargeInt(),

				//To indicate whether or not the user opened the message.
				isRead: CustomTypes.Bool(false),

				//To indicate whether or not the user claimed the reward in the message (if applicable).
				isClaimed: CustomTypes.Bool(false),
			}
		}
	};
};