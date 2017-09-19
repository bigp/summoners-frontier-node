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
		trace("MONGO setup: ".yellow + `initialized (Connecting using "${MONGO_ENV}").`);

		const mongoConfig = {
			config: {
				autoIndex: false,
				useMongoClient: true
			}
		};

		const mongoURL = `mongodb://${CONFIG.USER}:${CONFIG.PASS}@localhost:${CONFIG.PORT}/${CONFIG.DB}?authSource=${CONFIG.DB_ADMIN}`;
		const conn = mongoose.connect(mongoURL, mongoConfig);
		const db = mongoose.connection.db;
		conn.then(resolve).catch(reject);

		//Alias:
		db.getCollectionNames = db.listCollections;

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

function forEachModel(schemaFile, name) {
	name = name.remove('model-').remove('.js');

	//Finally, let's create our Model, so we can instantiate and use it:
	const Model = mgHelpers.createModel(schemaFile, name);

	$$$.models[Model._nameTitled] = Model;

	function makeOptionsObj(req, options) {
		return _.extend({data: req.body}, options || {});
	}

	// Add the singular & plural form of the router
	// They each do something different for each HTTP VERB types
	const api = $$$.routes.api;
	const badVerbs = Model._def.blacklistVerbs || [];
	const customRoutes = Model._def.customRoutes || {};
	const adminRoute = '/admin' + Model.__route;
	const adminRoutes = '/admin' + Model.__routes;

	_.keys(customRoutes).forEach(routeName => {
		const __customRoute = Model.__route + "/" + routeName;
		const __adminRoute = adminRoute + "/" + routeName;
		const customRoute = customRoutes[routeName];

		api.use(__customRoute, (req, res, next) => {
			const opts = makeOptionsObj(req);
			customRoute(Model, req, res, next, opts);
		});

		api.use(__adminRoute, (req, res, next) => {
			const opts = makeOptionsObj(req);
			customRoute(Model, req, res, next, opts);
		});
	});

	// api.use(adminRoute + "$", (req, res, next) => {
	//
	// });

	api.use(adminRoutes + "$", (req, res, next) => {
		if(!req.auth.isAdmin) return sendError(res, "Only admin can call this.");

		Model.find({})
			.then(list => {
				mgHelpers.sendFilteredResult(res, list);
			})
			.catch(err => {
				sendError(res, err.message || err);
			});
	});

	api.use(adminRoutes + '/count', (req, res, next) => {
		if(!req.auth.isAdmin) return sendError(res, "Can't count here.");

		Model.count((err, count) => {
			if(err) return sendError(res, `Could not count model '${Model._nameTitled}':\n`+err.message);
			sendResult(res, {count: count});
		})
	});
}