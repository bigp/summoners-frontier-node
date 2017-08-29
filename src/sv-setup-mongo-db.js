/**
 * Created by Chamberlain on 8/11/2017.
 */
const mgHelpers = require('./sv-mongo-helpers');
const mongoose = require('mongoose');
const sendError = $$$.send.error;
const sendResult = $$$.send.result;
const sendNotImplemented = $$$.send.notImplemented;
const sendEmpty = $$$.send.empty;
const MONGO_ENV = $$$.env.ini.MONGO.ENV;
const NODE_ENV = $$$.env().toUpperCase();
const CONFIG = $$$.env.ini.PRIVATE[MONGO_ENV || 'MONGO_' + NODE_ENV];

module.exports = mongoSetup;

function mongoSetup() {
	return new Promise((resolve, reject) => {
		trace("Connect to Mongo using ENV: ".yellow + MONGO_ENV);

		const mongoURL = `mongodb://${CONFIG.USER}:${CONFIG.PASS}@localhost:${CONFIG.PORT}/${CONFIG.DB}?authSource=${CONFIG.DB_ADMIN}`;
		const conn = mongoose.connect(mongoURL);
		conn.then(resolve).catch(reject);

		mgHelpers.plugins.autoIncrement.initialize(conn);
	});
}

_.extend(mongoSetup, {
	createMongoModels
});

function createMongoModels() {
	return new Promise((resolve, reject) => {
		$$$.models = {};

		$$$.files.forEachJS($$$.paths.__mongoSchemas, forEachModel, resolve);
	});
}

/*function onMongoReady() {
 //wait( () => {
 $$$.emit('mongo-ready');
 $$$.emit('ready');
 //} );
 }*/

function forEachModel(schemaFile, name) {
	name = name.remove('model-').remove('.js');

	//Finally, let's create our Model, so we can instantiate and use it:
	const Model = mgHelpers.createModel(schemaFile, name);

	$$$.models[Model._nameTitled] = Model;

	const METHODS = Model.httpVerbs = {
		////////////////////////////////////////////////// ONE:

		GET_ONE(req, res, next, options) {
			const q = mgHelpers.getWhitelistProps(Model, req, res);
			if(!q) return;

			mgHelpers.getSorted(options, Model.findOne(q)).exec()
				.then(data => {
					if (!data) return sendEmpty(res);
					mgHelpers.sendFilteredResult(res, data);
				})
				.catch(err => {
					sendError(res, `'${Model._nameTitled}' not found.`, q);
				});
		},

		POST_ONE(req, res, next, options) {
			const illegalData = mgHelpers.getIllegals(options);
			if(illegalData.length) {
				return sendError(res, `Used illegal field(s) while adding to '${Model._nameTitled}'`, illegalData);
			}

			const uniqueOr = mgHelpers.getORsQuery(options.data, Model._uniques);

			if(!uniqueOr.$or.length) {
				return sendError(res, 'Missing required fields.', options.data);
			}

			Model.find(uniqueOr).exec()
				.then(data => {
					if (data && data.length > 0) {
						const dups = {}, result = data[0];

						_.keys(options.data).forEach(key => {
							if(mgHelpers.isPrivateField(key)) return;

							const val = options.data[key];
							if (val === result[key]) dups[key] = val;
						});

						throw new $$$.DetailedError("Data not unique.", {
							duplicates: {
								fields: _.keys(dups),
								values: _.values(dups)
							}
						});
					}

					const newUser = new Model(options.data);
					return newUser.save()
				})
				.then(data => {
					mgHelpers.sendFilteredResult(res, data);
				})
				.catch(err => {
					const errMessage = `Could not add '${Model._nameTitled}' in database.`;

					if(err.details) return sendError(res, errMessage, err.details);

					if(err.message && err.message.has('validation')) {
						const errors = [];
						_.keys(err.errors).forEach(key => {
							var reason = err.errors[key].message;
							if(reason.has('is required.')) {
								reason = reason.replace("Path", "Field");
							}

							errors.push( reason );
						});

						return sendError(res, {message: errMessage, reasons: errors});
					}

					sendError(res, errMessage + ' ' + err.message);
					//trace(err);
				});
		},

		PUT_ONE(req, res, next, options) {
			const q = mgHelpers.getWhitelistProps(Model, req, res, mgHelpers.MANDATORY_FIELDS, true);
			if(!q) return;

			options.new = true;

			Model.findOneAndUpdate(q, {$set: options.data}, options, (err, data) => {
				if(err || data.n===0) {
					return sendError(res, `Could not update '${Model._nameTitled}' in database, verify query: ` + _.jsonPretty(q));
				}
				mgHelpers.sendFilteredResult(res, data);
			});
		},

		DELETE_ONE(req, res, next, options) {
			const q = mgHelpers.getWhitelistProps(Model, req, res, mgHelpers.MANDATORY_FIELDS, true);
			if(!q) return;

			Model.remove(q).exec()
				.then(data => mgHelpers.sendFilteredResult(res, data))
				.catch(err => {
					sendError(res, `Could not remove '${Model._nameTitled}' with supplied queries: ` + _.keys(q));
				});
		},

		////////////////////////////////////////////////// MANY:

		GET_MANY(req, res, next, options) {
			const q = mgHelpers.getWhitelistProps(Model, req, res);
			if(!q) return;

			mgHelpers.getSorted(options, Model.find(q)).exec()
				.then(data => mgHelpers.sendFilteredResult(res, data))
				.catch(err => {
					sendError(res, `Could not get many '${Model._nameTitled}' with supplied queries: ` + _.keys(q));
				});
		},

		POST_MANY(req, res, next, options) {
			sendNotImplemented(res);
		},

		PUT_MANY(req, res, next, options) {
			sendNotImplemented(res);
		},

		DELETE_MANY(req, res, next, options) {
			sendNotImplemented(res);
		},
	};

	function modelRouter(methodSuffix, options) {
		if(!options) options = {};

		return (req, res, next) => {
			const methodName = req.method + methodSuffix;
			const method = METHODS[methodName];

			if(!req.auth.isAdmin && badVerbs.has(methodName)) {
				return sendError(res, `'${name}' model does not allow this operation (${methodName})`);
			}

			if(options.isAdmin && !req.auth.isAdmin) {
				return sendError(res, `Admin only.`);
			}

			if(!method) {
				return sendError(res, "Oh no, bad method? " + methodName);
			}

			const opts = makeOptionsObj(req, options);

			method(req, res, next, opts);
		}
	}

	function makeOptionsObj(req, options) {
		return _.extend({data: req.body}, options || {});
	}

	// Add the singular & plural form of the router
	// They each do something different for each HTTP VERB types
	const api = $$$.routes.api;
	const badVerbs = Model._def.blacklistVerbs || [];
	const customRoutes = Model._def.customRoutes || {};

	_.keys(customRoutes).forEach(routeName => {
		const __customRoute = Model.__route + "/" + routeName;
		const customRoute = customRoutes[routeName];

		api.use(__customRoute, (req, res, next) => {
			const opts = makeOptionsObj(req);
			customRoute(Model, req, res, next, opts);
		});
	});

	api.use(Model.__route + "$", modelRouter('_ONE', {isAdmin:1}));
	api.use(Model.__route + "/last", modelRouter('_ONE', {reverse:1, isAdmin:1}) );
	api.use(Model.__routes + "$", modelRouter('_MANY', {isAdmin:1}));
	api.use(Model.__routes + '/count', (req, res, next) => {
		if(!req.auth.isAdmin) return sendError(res, "Can't count here.");

		Model.count((err, count) => {
			if(err) return sendError(res, `Could not count model '${Model._nameTitled}':\n`+err.message);
			sendResult(res, {count: count});
		})
	});
}