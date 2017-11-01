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
	var User, Shop, Item, Hero, MsgReceipt, MsgTemplate;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;
		MsgReceipt = $$$.models.MessageReceipt;
		MsgTemplate = $$$.models.MessageTemplate;
	});

	return {
		plural: 'messageTemplates',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'get::list$'(Model, req, res, next, opts) {
				const results = {};
				MsgTemplate.find()
					.then(messages => {
						results.messages = messages;
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						$$$.send.error(res, err);
					}); //
			},

			'get::inbox$'(Model, req, res, next, opts) {
				const results = {};
				const q = {'game.isForEveryone':true};
				MsgTemplate.find(q)
					.then(messages => {
						results.messages = messages;
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						$$$.send.error(res, err);
					}); //
			},

			'open'(Model, req, res, next, opts) {
				$$$.send.notImplemented(res);
			},

			'send'(Model, req, res, next, opts) {
				$$$.send.notImplemented(res);
			},

			'post::add'(Model, req, res, next, opts) {
				const msg = new MsgTemplate();
				const params = opts.data;
				const user = req.auth.user;

				_.promise(() => {
					if(!params || !params.game) {
						throw 'Missing request body with a "game" field.';
					}

					msg.userId = user ? user.id : -1;
					msg.dateCreated = new Date();
					_.merge(msg.game, params.game);

					return msg.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						//if(mgHelpers.isValidationError(err, res, 'MessageTemplate is invalid.')) return;
						$$$.send.error(res, err.toString())
					});
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
				jobID: CustomTypes.StringCustom(128),
				jobName: CustomTypes.StringCustom(128),
				title: CustomTypes.StringCustom(128, {required:true}),
				message: CustomTypes.StringCustom(1024, {required:true}),
				imageURL: CustomTypes.StringCustom(1024),
				type: CustomTypes.StringCustom(64, {required:true}),

				destinations: [CustomTypes.LargeInt()],
				destinationGroups: [CustomTypes.LargeInt()],

				dateExpires: CustomTypes.DateRequired(),
				dateToPublish: CustomTypes.DateRequired(),

				//For scheduled messages, they can only be 'read' once this flag is true.
				isPublished: CustomTypes.Bool(false),

				//To mark system-wide / dev messages (as opposed to other users)
				isForEveryone: CustomTypes.Bool(false),

				/**
				 * Specify what type of item / prize can be claimed.
				 *
				 * If it's a limited-time offer item, a costType / costAmount
				 * can be specified. Otherwise, if it's free, those fields can be
				 * left blank.
				 */

				reward: {
					item: CustomTypes.StringCustom(1024), // Potentially long JSON data.
					costType: CustomTypes.String64(64), //Gold, Gems, Shards, etc.
					costAmount: CustomTypes.Int(), //Number
				},
			}
		}
	};
};



// 'send-later'(Model, req, res, next, opts) {
// 	$$$.send.notImplemented(res);
// },
//
// 'schedule'(Model, req, res, next, opts) {
// 	$$$.send.notImplemented(res);
//
// 	/**
// 	 * Will serve as a 'CRON-JOB' UI access for admins / devs to
// 	 * add/remove/edit reoccurring events.
// 	 *
// 	 * Instead of using a new MongoDB model just for the sake of saving
// 	 * the state of cron-jobs, they can be written to a JSON file in the
// 	 * /.private/ data folder. When the app starts, it'll load and start
// 	 * a timer -or- interval that periodically checks if the current-time
// 	 * should trigger one or more of the tasks saved in the JSON cron-jobs.
// 	 *
// 	 * This can be used to set weekly notifications, daily rewards,
// 	 * monthly prizes, season resets, etc.
// 	 */
// },