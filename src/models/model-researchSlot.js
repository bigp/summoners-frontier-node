/**
 * Created by Chamberlain on 8/29/2017.
 */

const moment = require('moment');
const gameHelpers = require('../sv-json-helpers');
const mgHelpers = require('../sv-mongo-helpers');
const mongoose = mgHelpers.mongoose;
const Schema  = mongoose.Schema;
const Types  = Schema.Types;
const CustomTypes  = mongoose.CustomTypes;
const ObjectId = Types.ObjectId;
const CONFIG = $$$.env.ini;

module.exports = function() {
	var User, Shop, Item, Hero, jsonGlobals;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;
		jsonGlobals = $$$.jsonLoader.globals['preset-1'];
	});

	const STATUS = {
		NULL: "null",
		LOCKED: "locked",
		UNLOCKED: "unlocked",
		BUSY: "busy",
		COMPLETED: "completed"
	};

	function SlotStatus(params) {
		this.params = params;
		this.results = {slot: params.slot};
		this.slot = params.slot;
		this.game = params.slot.game;
	}

	_.extend(SlotStatus.prototype, {
		is(status) {
			return this.game.status===status;
		},

		check(status, dateProperty) {
			if (!this.is(status)) throw `Slot status should be "${status}" first!`;

			if(!dateProperty) return;

			if(!this.game[dateProperty]) throw 'Invalid date*** property name, not found in slot object: ' + dateProperty;
			if (this.game[dateProperty].getTime() > 0) throw `The slot.${dateProperty} was already set!`;

			this.game[dateProperty] = new Date();
		},

		send() {
			mgHelpers.sendFilteredResult(this.params.res, this.results);
		},

		saveStatus(status) {
			if(this.game.status===status) throw 'Slot is already set to status: ' + status;

			this.game.status = status;
			return this.slot.save();
		},

		buyStatus(status, cost) {
			const params = this.params;

			mgHelpers.currency.auto(params.cost, params.currency, true);

			_.extend(this.results, {currency: params.currency});

			return Promise.all([params.user.save(), this.saveStatus(status)]);
		}
	});

	return {
		plural: 'researchSlots',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'get::list'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const orderBy = [
					['game.trayID',1],
					['game.slotIndex', 1]
				];

				Model.find({userId: user.id}).sort(orderBy)
					.then( results => {
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch( err => $$$.send.error(res, err));
			},

			'put::/:trayID/:slotID/*'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const trayID = req.params.trayID;
				const slotID = req.params.slotID;
				const trayMax = jsonGlobals.RESEARCH_TRAY_LIMIT | 0;
				const slotMax = jsonGlobals.RESEARCH_SLOT_LIMIT | 0;

				_.promise(() => {
					if(isNaN(trayID)) throw `Research-Slot TRAY_ID must be numeric.`;
					if(isNaN(slotID)) throw `Research-Slot SLOT_ID must be numeric.`;
					if(trayID<0) throw `Research TRAY_ID must be greater-than >= 0.`;
					if(slotID<0) throw `Research SLOT_ID must be greater-than >= 0.`;
					if(trayID>=trayMax) throw `Research TRAY_ID must be less-than < ${trayMax}.`;
					if(slotID>=slotMax) throw `Research SLOT_ID must be less-than < ${slotMax}.`;

					return Model.findOrCreate({userId: user.id, 'game.trayID': trayID, 'game.slotID': slotID});
				})
					.then( slotCreated => {
						const slot = slotCreated.doc;
						req.slot = slot;

						req.slotStatus = new SlotStatus({
							req: req,
							res: res,
							opts: opts,
							user: user,
							currency: user.game.currency,
							cost: opts.data.cost,
							slot: slot,
						});

						next();
					})
					.catch( err => $$$.send.error(res, err));
			},

			'put::/:trayID/:slotID/unlocked'(Model, req, res, next, opts) {
				const slot = req.slot;
				const slotStatus = req.slotStatus;
				const dateZero = new Date(0);

				_.promise(() => {
					slotStatus.check(STATUS.LOCKED, 'dateUnlocked');

					slot.game.dateStarted = dateZero;
					slot.game.dateCompleted = dateZero;

					return slotStatus.buyStatus(STATUS.UNLOCKED);
				})
					.then(() => slotStatus.send())
					.catch( err => $$$.send.error(res, err) );
			},

			'put::/:trayID/:slotID/busy'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const slotStatus = req.slotStatus;
				const itemID = opts.data.itemID;

				_.promise(() => {
					if (isNaN(itemID)) throw 'Must provide a numerical "itemID" value in data: ' + itemID;

					slotStatus.check(STATUS.UNLOCKED, 'dateStarted');

					return Item.findOne({userId: user.id, id: itemID});
				})
					.then(item => {
						if(!item) throw 'Item does not exists OR does not belong to this user.';
						if(item.game.isIdentified) throw 'Item is already identified!';
						if(item.game.isResearched) throw 'Item is already being researched!';

						item.game.isResearched = true;
						slotStatus.results.item = item;

						slotStatus.game.itemID = itemID;

						return Promise.all([
							item.save(),
							slotStatus.buyStatus(STATUS.BUSY)
						]);
					})
					.then(() => slotStatus.send())
					.catch( err => $$$.send.error(res, err) );
			},

			'put::/:trayID/:slotID/completed'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const slotStatus = req.slotStatus;
				const itemID = slotStatus.game.itemID;

				_.promise(() => {
					slotStatus.check(STATUS.BUSY, 'dateCompleted');
					if(isNaN(itemID) || itemID<1) throw 'No item was assigned to this slot!';

					return slotStatus.saveStatus(STATUS.COMPLETED);
				})
					.then(() => slotStatus.send())
					.catch( err => $$$.send.error(res, err) );
			},

			'put::/:trayID/:slotID/reset'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const slot = req.slot;
				const slotStatus = req.slotStatus;
				const dateZero = new Date(0);
				const itemID = slot.game.itemID;

				Item.findOne({userId: user.id, id: itemID})
					.then(item => {
						// CRITICAL ERROR HERE!!!
						if(!item) throw 'The slot completed research on an item the user does NOT own / exists: ' + itemID;
						if(!item.game.isResearched) throw 'Item was not being researched: ' + itemID;
						slotStatus.check(STATUS.COMPLETED);

						item.game.isResearched = false;
						item.game.isIdentified = true;
						slotStatus.results.item = item;

						// Reset the date timestamps for the 'started' and 'completed' dates.
						slot.game.dateStarted = dateZero;
						slot.game.dateCompleted = dateZero;
						slot.game.itemID = -1;

						return Promise.all([
							item.save(),
							slotStatus.saveStatus(STATUS.UNLOCKED)
						]);
					})
					.then(() => slotStatus.send())
					.catch( err => $$$.send.error(res, err) );
			}

			//////////////////////////////////////////////////////////////
		},

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				trayID: CustomTypes.Int(),
				slotID: CustomTypes.Int(),
				itemID: CustomTypes.LargeInt({default: -1}),
				status: CustomTypes.String16({default: STATUS.LOCKED}),
				dateUnlocked: CustomTypes.DateRequired({default: new Date(0)}),
				dateStarted: CustomTypes.DateRequired({default: new Date(0)}),
				dateCompleted: CustomTypes.DateRequired({default: new Date(0)}),
			}
		}
	};
};