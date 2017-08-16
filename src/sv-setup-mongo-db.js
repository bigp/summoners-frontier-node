/**
 * Created by Chamberlain on 8/11/2017.
 */
const mgHelpers = require('./sv-mongo-helpers');
const mongoose = require('mongoose');
const sendError = $$$.send.error;
const sendResult = $$$.send.result;
const sendNotImplemented = $$$.send.notImplemented;
const sendEmpty = $$$.send.empty;

module.exports = mongoSetup;

function mongoSetup() {
	const conn = mongoose.connect('mongodb://localhost:27017/sf-dev-test', onMongoConnected);

	mgHelpers.plugins.autoIncrement.initialize(conn);
}

function onMongoConnected(err) {
	if(err) throw err;

	$$$.models = {};

	$$$.files.forEachJS($$$.paths.__mongoSchemas, (schemaFile, name) => {
		name = name.remove('model.').remove('.js');

		//Finally, let's create our Model, so we can instantiate and use it:
		const Model = mgHelpers.createModel(schemaFile, name);
		$$$.models[Model._nameTitled] = Model;

		const METHODS = {
			////////////////////////////////////////////////// ONE:

			GET_ONE(req, res, next, options) {
				const q = mgHelpers.getWhitelistProps(Model, req, res);
				if(!q) return;

				mgHelpers.getSorted(options, Model.findOne(q)).exec()
					.then(data => {
						if (!data) return sendEmpty(res);
						sendResult(res, data);
					})
					.catch(err => {
						sendError(res, 'User not found.', q);
					});
			},

			POST_ONE(req, res, next, options) {
				const illegalData = mgHelpers.getIllegals(options);
				if(illegalData.length) {
					return sendError(res, `Used illegal field(s) while adding to ${name}`, illegalData);
				}

				const uniqueOr = mgHelpers.getORsQuery(options, Model._uniques);

				if(!uniqueOr.$or.length) {
					return sendError(res, 'Missing required fields.', options.data);
				}

				Model.find(uniqueOr).exec()
					.then(data => {
						if(data && data.length>0) {
							const dups = {}, result = data[0];

							_.keys(options.data).forEach(key => {
								const val = options.data[key];
								if(val===result[key]) dups[key] = val;
							});

							sendError(res, "Data not unique.", {duplicateFields: dups});
							throw "";
						}

						const newUser = new Model(options.data);
						return newUser.save();
					})
					.then(data => {
						sendResult(res, data);
					})
					.catch(err => {
						if(!err) return;
						sendError(res, `Could not add "${name}" in database. ` + err.message);
						//trace(err);
					});
			},

			PUT_ONE(req, res, next, options) {
				const q = mgHelpers.getWhitelistProps(Model, req, res, mgHelpers.MANDATORY_FIELDS, true);
				if(!q) return;

				options.new = true;

				Model.findOneAndUpdate(q, {$set: options.data}, options, (err, data) => {
					if(err || data.n===0) {
						return sendError(res, `Could not update ${name} in database, verify query: ` + _.jsonPretty(q));
					}
					sendResult(res, data);
				});
			},

			DELETE_ONE(req, res, next, options) {
				const q = mgHelpers.getWhitelistProps(Model, req, res, mgHelpers.MANDATORY_FIELDS, true);
				if(!q) return;

				Model.remove(q).exec()
					.then(data => sendResult(res, data))
					.catch(err => {
						sendError(res, `Could not remove ${name} with supplied queries: ` + _.keys(q));
					});
			},

			////////////////////////////////////////////////// MANY:

			GET_MANY(req, res, next, options) {
				const q = mgHelpers.getWhitelistProps(Model, req, res);
				if(!q) return;

				mgHelpers.getSorted(options, Model.find(q)).exec()
					.then(data => sendResult(res, data))
					.catch(err => {
						sendError(res, `Could not get many ${name} with supplied queries: ` + _.keys(q));
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

		function modelRouter(methodForm, options) {
			if(!options) options = {};

			return (req, res, next) => {
				const methodName = req.method + methodForm;
				const method = METHODS[methodName];
				if(!method) {
					traceError("Oh no, bad method? " + methodName);
					return next();
				}

				const opts = _.extend({data: req.body[Model._name]}, options);

				method(req, res, next, opts);
			}
		}

		// Add the singular & plural form of the router
		// They each do something different for each HTTP VERB types
		const api = $$$.routes.api;
		api.use(Model.__route + "$", modelRouter('_ONE'));
		api.use(Model.__route + "/last", modelRouter('_ONE', {reverse:1}) );
		api.use(Model.__routes + "$", modelRouter('_MANY'));
		api.use(Model.__routes + '/count', (req, res, next) => {
			Model.count((err, count) => {
				if(err) return sendError(res, `Could not count model "${name}":\n`+err.message);
				sendResult(res, {count: count});
			})
		});


	}, onMongoReady);
}

function onMongoReady() {
	//wait( () => {
		$$$.emit('mongo-ready');
		$$$.emit('ready');
	//} );
}