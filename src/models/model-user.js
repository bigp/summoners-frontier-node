/**
 * Created by Chamberlain on 8/11/2017.
 */

const gameHelpers = require('../sv-json-helpers');
const nodemailer = require('../sv-setup-nodemailer');
const mgHelpers = require('../sv-mongo-helpers');
const request = require('request-promise');
const mongoose = mgHelpers.mongoose;
const CONFIG = $$$.env.ini;
const PRIVATE = CONFIG.PRIVATE;
const Schema  = mongoose.Schema;
const CustomTypes  = mongoose.CustomTypes;
const changeCase = require('change-case');

module.exports = function() {
	var User, Item, Hero, Shop, LootCrate, Exploration, jsonBoosts, jsonGlobals;

	process.nextTick(() => {
		trace("In model-user.js:".magenta);
		traceProps($$$.models);

		User = $$$.models.User;
		Hero = $$$.models.Hero;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		LootCrate = $$$.models.Lootcrate;
		Exploration = $$$.models.Exploration;
	});

	$$$.jsonLoader.onAndEmit('json-reloaded', () => {
		jsonGlobals = $$$.jsonLoader.globals['preset-1'];
		jsonBoosts = gameHelpers.getBoosts(); //.map(boost => boost.identity);
	});

	return {
		plural: 'users',
		customRoutes: {
			'public/add'(Model, req, res, next, opts) {
				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'POST')) return;

					const g = gameHelpers.getJSONGlobals();
					const userData = opts.data;

					userData.username = userData.username.toLowerCase();
					userData._password = (userData._password || $$$.md5(userData.password)).toLowerCase();
					userData.game = {
						currency: {
							gold: g.GOLD,
							gems: g.GEMS,
							magicOrbs: g.MAGIC_ORBS,

							scrollsIdentify: g.SCROLLS_IDENTIFY,
							scrollsSummonCommon: g.SCROLLS_SUMMON_COMMON,
							scrollsSummonRare: g.SCROLLS_SUMMON_RARE,
							scrollsSummonMonsterFire: g.SCROLLS_SUMMON_MONSTER_FIRE,
							scrollsSummonMonsterWater: g.SCROLLS_SUMMON_MONSTER_WATER,
							scrollsSummonMonsterWind: g.SCROLLS_SUMMON_MONSTER_WIND,
							scrollsSummonMonsterLight: g.SCROLLS_SUMMON_MONSTER_LIGHT,
							scrollsSummonMonsterDark: g.SCROLLS_SUMMON_MONSTER_DARK,

							shardsItemsCommon: g.SHARDS_ITEMS_COMMON,
							shardsItemsMagic: g.SHARDS_ITEMS_MAGIC,
							shardsItemsRare: g.SHARDS_ITEMS_RARE,
							shardsItemsUnique: g.SHARDS_ITEMS_UNIQUE,

							shardsXPCommon: g.SHARDS_XP_COMMON,
							shardsXPMagic: g.SHARDS_XP_MAGIC,
							shardsXPRare: g.SHARDS_XP_RARE,
							shardsXPUnique: g.SHARDS_XP_UNIQUE,

							essenceLow: g.ESSENCE_LOW,
							essenceMid: g.ESSENCE_MID,
							essenceHigh: g.ESSENCE_HIGH,

							relicsSword: g.RELIC_SWORD,
							relicsShield: g.RELIC_SHIELD,
							relicsStaff: g.RELIC_STAFF,
							relicsBow: g.RELIC_BOW,
						}
					};

					const user = new User();
					_.extend(user, userData);
					return user.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'public/login'(Model, req, res, next, opts) {
				const data = opts.data;
				opts.data.username = (opts.data.username || '').toLowerCase();
				opts.data.email = (opts.data.email || '').toLowerCase();
				const password = (opts.data._password || $$$.md5(opts.data.password)).toLowerCase();
				const missingFields = [];
				const LOGIN_FAILED = 'LOGIN FAILED';

				if(!password) {
					missingFields.push('password');
				}
				if(!opts.data.username && !opts.data.email) {
					missingFields.push('username/email');
				}

				if(missingFields.length>0) {
					return $$$.send.errorCustom(res, 'Missing fields: ' + missingFields.join(', '), LOGIN_FAILED)
				}

				const orQuery = mgHelpers.getORsQuery(opts.data, ['username', 'email']);
				const andQuery = _.extend(orQuery, {_password: password});

				Model.findOne(andQuery).exec()
					.then(user => {
						if(!user) {
							traceError(password);
							throw "Incorrect Username and Password!";
						}

						//Always clear the password-reset on successful logins:
						user._passwordResetGUID = '';

						user.updateLoginDetails({ping:1, login:1, token:1});

						return user.save();
					})
					.then(user => {
						var results = _.merge({
							gitInfo: {
								long: $$$.gitInfo.long,
								branch: $$$.gitInfo.branch,
								date: $$$.gitInfo.date
							}
						}, user.toJSON());

						//var results = _.assign({mongoID: user._id+''}, user.toJSON());
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						trace(err);
						$$$.send.errorCustom(res, err, LOGIN_FAILED);
					});
			},

			'public/forget-password'(Model, req, res, next, opts) {
				const q = {username: opts.data.username};

				Model.findOne(q).exec()
					.then(found => {
						if(!found) throw 'User not found!';
						found._passwordResetGUID = req.auth.pwdResetGUID = _.guid();

						return nodemailer.sendEmail(found.email, "ERDS - Password Reset", "GUID: " + found._passwordResetGUID)
					})
					.then( emailInfo => {
						if(!emailInfo) throw 'Email could not be sent!';

						if(emailInfo.isEmailDisabled && opts.data.direct) {
							emailInfo.guid = req.auth.pwdResetGUID;
						}

						$$$.send.result(res, emailInfo);
					})
					.catch(err => {
						$$$.send.errorCustom(res, err, "PASSWORD-RESET FAILED");
					})

			},

			// TODO:
			// 'password-reset'(Model, req, res, next, opts) {
			//
			// },
			//
			// 'password-reset-sent'(Model, req, res, next, opts) {
			//
			// }

			'logout'(Model, req, res, next, opts) {
				const user = req.auth.user;

				//Clear the current fields:
				user.login.token = ''; //Clear the token
				user.login.datePing = $$$.nullDate();

				user.save()
					.then(() => {
						$$$.send.result(res, {logout: true});
					});
			},

			'test-echo'(Model, req, res, next, opts) {
				const user = req.auth.user;
				$$$.send.result(res, _.extend({name: user.name, username: user.username}, opts.data));
			},

			//////////////////////////////////////////////////////////////

			'game'(Model, req, res, next, opts) {
				const user = req.auth.user;
				if(mgHelpers.isWrongVerb(req, "GET")) return;

				mgHelpers.sendFilteredResult(res, user.game);
			},

			'completed-act-zone'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const actZone = opts.data.actZone;

				if(isNaN(actZone)) return $$$.send.error(res, "Missing actZone.");

				user.game.actsZones.completed = actZone;
				user.save()
					.then( updated => {
						mgHelpers.sendFilteredResult(res, updated.game.actsZones);
					});
			},

			'get::/currency'(Model, req, res, next, opts) {
				const user = req.auth.user;

				mgHelpers.sendFilteredResult(res, user.game.currency);
			},

			'put::/currency'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const cost = opts.data;

				_.promise(() => {
					if(mgHelpers.currency.isInvalid(cost, currency, false)) return;

					mgHelpers.currency.modify(cost, currency, 0);

					return user.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, user.game.currency);
					})
					.catch(err => $$$.send.error(res, err));
			},

			'everything$'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const q = {userId: user.id};
				const results = {user: user};

				Promise.all([
					Item.find(q).sort('id').exec(),
					Hero.find(q).sort('id').exec(),
					LootCrate.find(q).sort('id').exec(),
					Exploration.find(q).sort('id').exec(),
				])
				.then( belongings  => {
					results.items = belongings[0];
					results.heroes = belongings[1];
					results.lootCrates = belongings[2];
					results.explorations = belongings[3];
					results.jsonLoader = {dateLoaded: $$$.jsonLoader.dateLoaded};

					mgHelpers.sendFilteredResult(res, results);
				})
					.catch(err => {
						$$$.send.error(res, err);
					})
			},

			'everything/remove'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const results = {user: user};

				mgHelpers.prepareRemoveRequest(req)
					.then(q => {
						return Promise.all([
							Item.remove(q),
							Hero.remove(q),
							LootCrate.remove(q),
							Exploration.remove(q)
						]);
					})
					.then( removals => {
						results.itemsRemoved = removals[0].toJSON().n;
						results.heroesRemoved = removals[1].toJSON().n;
						results.lootCratesRemoved = removals[2].toJSON().n;
						results.explorationsRemoved = removals[3].toJSON().n;

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err));
			},

			'put::xp'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(isNaN(opts.data.xp)) throw 'Missing "xp" field in POST data.';

					user.game.xp = opts.data.xp | 0;
					return user.save();
				})
					.then( saved => mgHelpers.sendFilteredResult(res, saved))
					.catch( err => $$$.send.error(res, err));
			},

			'put::lastLevel'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(isNaN(opts.data.lastLevel)) throw 'Missing "lastLevel" field in POST data.';

					user.game.lastLevel = opts.data.lastLevel | 0;
					return user.save();
				})
					.then( saved => mgHelpers.sendFilteredResult(res, saved))
					.catch( err => $$$.send.error(res, err));
			},

			'put::explore-slots'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(isNaN(opts.data.exploreSlots)) throw 'Missing "exploreSlots" field in POST data.';

					user.game.actsZones.exploreSlots = opts.data.exploreSlots | 0;
					return user.save();
				})
					.then( saved => mgHelpers.sendFilteredResult(res, saved))
					.catch( err => $$$.send.error(res, err));
			},

			'get::analytics'(Model, req, res, next, opts) {
				const user = req.auth.user;

				mgHelpers.sendFilteredResult(res, user.game.analytics);
			},

			'put::/boosts/add'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const boosts = user.game.boosts;
				const slots = boosts.slots;
				const cost = opts.data.cost;

				_.promise(() => {
					if(slots.length >= jsonGlobals.BOOST_LIMIT) throw `Cannot add any more boost slots, reached limit! (${jsonGlobals.BOOST_LIMIT})`;
					if(!cost || mgHelpers.currency.isInvalid(cost, currency, true)) throw 'Missing "cost" field in request.';

					mgHelpers.currency.modify(cost, currency, -1);
					slots.push({identity: ''});

					return user.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, _.assign({currency: currency}, boosts.toJSON()));
					})
					.catch(err => $$$.send.error(res, err));
			},

			'boosts/:boostID'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const boosts = user.game.boosts;
				const slots = boosts.slots;

				_.promise(() => {
					if(!slots.length) throw 'Impossible to get boost, no slots available!';
					const boostID = req.params.boostID | 0;
					if(isNaN(boostID)) throw `boostID must be defined!`;
					if(boostID<0 || boostID>=slots.length) throw `boostID must be between 0 - ${slots.length-1}`;

					req.validBoost = slots[boostID];

					next();
				}).catch(err => $$$.send.error(res, err));
			},

			'get::boosts/:boostID'(Model, req, res, next, opts) {
				mgHelpers.sendFilteredResult(res, {boost: req.validBoost});
			},

			'put::boosts/:boostID/activate'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const boost = req.validBoost;
				const boostData = opts.data;
				const currency = user.game.currency;

				_.promise(() => {
					if(boost.dateStarted.getTime()>0 || boost.isActive) throw 'Boost already active.';
					if(!boostData || !boostData.identity) throw 'Missing boost "identity" parameter in JSON request.';

					var foundBoost = jsonBoosts.find(b => b.identity === boostData.identity);
					if(!foundBoost) throw 'Invalid boost-identity requested: ' + boostData.identity;

					var boostCurrency = changeCase.camelCase(boostData.identity);
					var cost = {};
					cost[boostCurrency] = 1;

					if(mgHelpers.currency.isInvalid(cost, currency, true)) return;

					mgHelpers.currency.modify(cost, currency, -1);

					boost.identity = boostData.identity;
					boost.isActive = true;
					boost.dateStarted = new Date();
					boost.count = boostData.forceCount || foundBoost['num-of-battles'];

					return user.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, {currency: currency, boost: boost});
					})
					.catch(err => $$$.send.error(res, err));
			},

			'put::boosts/:boostID/decrease'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const boost = req.validBoost;
				const results = {isDepleted:false, boost:boost};

				_.promise(() => {
					if(!boost.isActive) throw 'Boost is not active.';
					if(!boost.identity) throw 'Boost does not have an identity.';
					if(!boost.count) throw 'Boost count already depleted.';

					if((--boost.count)<=0) {
						results.isDepleted = true;

						boost.count = 0;
						boost.identity = '';
						boost.isActive = false;
						boost.dateStarted = new Date(0);
					}

					return user.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err));
			},

			'delete::boosts/clear-all/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const boosts = user.game.boosts;

				boosts.slots = [];
				user.save()
					.then(saved => {
						mgHelpers.sendFilteredResult(res, boosts);
					})
					.catch(err => $$$.send.error(res, err));
			}
		},

		traceRoutes: 'boosts',

		methods: {
			updateLoginDetails(which) {
				const login = this.login;
				const now = new Date();
				if(which.ping) login.datePing = now;
				if(which.login) {
					login.dateLast = login.dateNow;
					login.dateNow = now;
				}
				if(which.token) {
					login.tokenLast = this.token;
					login.token = this.createToken();
				}
			},

			createToken() {
				const shortMD5 = s => $$$.md5(s).substr(0, 16);
				//This could literally be any mixture of GUID + blablabla ... generate a nice long hash!
				return $$$.encodeToken(_.guid(), shortMD5(this.username), shortMD5(this.email));
			},

			sendLogin() {
				return $$$.send.api('/user/public/login', 'post', {
					body: {
						username: this.username,
						_password: this._password,
					}
				}).then( data => {
					this.login.token = data.login.token;
					return data;
				});
			},

			sendAuth(url, method, options) {
				if(!options) options = {};
				if(options==='*') {
					options = {
						body: {
							name: this.name,
							username: this.username,
							email: this.email,
							_password: this._password,
						}
					}
				}

				if(!options.headers) {
					options.headers = { 'Authorization': this.getAuthorizationString() };
				}

				return $$$.send.api(url, method, options);
			},

			getAuthorizationString() {
				return this.login.token ?
					$$$.encodeToken(PRIVATE.AUTH_CODE, this.username, this.login.token) :
					$$$.encodeToken(PRIVATE.AUTH_CODE);
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			name: CustomTypes.String128({required:true}),
			username: CustomTypes.String128({required:true, unique: 'Already have a user with this username ({VALUE})'}),
			email: CustomTypes.String128({required:true, unique: 'Already have a user with this email ({VALUE})'}),
			_password: CustomTypes.String128({required:true}),
			_passwordResetGUID: CustomTypes.String128(),

			dateCreated: CustomTypes.DateRequired(),

			login: {
				dateLast: CustomTypes.DateRequired(),
				dateNow: CustomTypes.DateRequired(),
				datePing: CustomTypes.DateRequired(),
				token: CustomTypes.String128(),
				tokenLast: CustomTypes.String128(),
			},

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				xp: CustomTypes.LargeInt({default: 0}),
				lastLevel: CustomTypes.Int({default: 1}),
				name: CustomTypes.String128({required:false}),

				/**
				 * TODO: For Messages, have the users "belong" to certain destination-groups.
				 *
				 * Examples:
				 *  - By demographics (?),
 				 */
				destinationGroupIDs: [CustomTypes.Int()],

				actsZones: {
					exploreSlots: CustomTypes.Int({default: 0}),
					completed: CustomTypes.Int(),
				},

				currency: {
					gold: CustomTypes.Int(),
					gems: CustomTypes.Int(),
					magicOrbs: CustomTypes.Int(),

					scrollsIdentify: CustomTypes.Int(),
					scrollsSummonCommon: CustomTypes.Int(),
					scrollsSummonRare: CustomTypes.Int(),
					scrollsSummonMonsterFire: CustomTypes.Int(),
					scrollsSummonMonsterWater: CustomTypes.Int(),
					scrollsSummonMonsterWind: CustomTypes.Int(),
					scrollsSummonMonsterLight: CustomTypes.Int(),
					scrollsSummonMonsterDark: CustomTypes.Int(),

					shardsItemsCommon: CustomTypes.LargeInt(),
					shardsItemsMagic: CustomTypes.LargeInt(),
					shardsItemsRare: CustomTypes.LargeInt(),
					shardsItemsUnique: CustomTypes.LargeInt(),

					shardsXpCommon: CustomTypes.LargeInt(),
					shardsXpMagic: CustomTypes.LargeInt(),
					shardsXpRare: CustomTypes.LargeInt(),
					shardsXpUnique: CustomTypes.LargeInt(),

					essenceLow: CustomTypes.LargeInt(),
					essenceMid: CustomTypes.LargeInt(),
					essenceHigh: CustomTypes.LargeInt(),

					relicsSword: CustomTypes.LargeInt(),
					relicsShield: CustomTypes.LargeInt(),
					relicsStaff: CustomTypes.LargeInt(),
					relicsBow: CustomTypes.LargeInt(),

					boostGold: CustomTypes.Int(),
					boostXp: CustomTypes.Int(),
					boostHealth: CustomTypes.Int(),
					boostMagicfind: CustomTypes.Int(),
				},

				shopInfo: {
					//TODO: FEATURE!!! We could have the players purchase EXTRA shop-slots to see more items per refresh-keys.
					expansionSlots: CustomTypes.Int({default:0}),

					dateLastPurchasedFeaturedItem: CustomTypes.DateRequired({required: false, default: new Date(0)}),
					refreshKey: {
						purchased: [CustomTypes.Int()],
						seed: CustomTypes.LargeInt({min: -1, default: -1}),
						_dateGenerated: CustomTypes.DateRequired({required: false, default: new Date(0)}),
					}
				},

				analytics: {
					heroesDiscovered: [new Schema({
						identity: CustomTypes.String128(),
						dateDiscovered: CustomTypes.DateRequired(),
						dateLastCounted: CustomTypes.DateRequired(),
						count: CustomTypes.Int({required: true, default: 0})
					}, {_id: false})]
				},

				boosts: {
					//TODO: Move boosts from 'currency' to here 'inventory', and dynamically add them.
					inventory: {
						// ???
					},

					slots: [new Schema({
						identity: CustomTypes.String128(),
						isActive: CustomTypes.Bool(false),
						dateStarted: CustomTypes.DateRequired({default: new Date(0)}),
						count: CustomTypes.Int(),
					}, {_id: false})]
				},
			}
		}
	};
};