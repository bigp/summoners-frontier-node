/**
 * Created by Chamberlain on 8/11/2017.
 */
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const uniqueValidator = require('mongoose-beautiful-unique-validation');
const changeCase = require('change-case');
const Schema = mongoose.Schema;
const Types  = mongoose.Schema.Types;

const ERROR_MAXLENGTH= '`{PATH}` field must be {MAXLENGTH} chars, you used {VALUE}.';

mongoose.Promise = global.Promise;
mongoose.CustomTypes = {
	String128: (opt) => _.extend({type: Types.String, trim: true, maxlength: [128, ERROR_MAXLENGTH]}, opt),
	String256: (opt) => _.extend({type: Types.String, trim: true, maxlength: [256, ERROR_MAXLENGTH]}, opt),
	DateRequired: (opt) => _.extend({type: Types.Date, required: true, default: () => new Date()}, opt),
};

const MANDATORY_FIELDS = ['_id', 'id'];

module.exports = function mongoSetup() {
	const conn = mongoose.connect('mongodb://localhost:27017/sf-dev-test', onMongoConnected);

	autoIncrement.initialize(conn);
};

function applyPlugins(schema) {
	schema.plugin(uniqueValidator);
	schema.plugin(autoIncrement.plugin, {
		model: schema._name,
		field: 'id',
		startAt: 1,
	});
}

function sendError(res, err) {
	res.status(500).send(err);
	return false;
}

function sendNotImplemented(res) {
	sendError(res, 'Not implemented yet: ' + res.req.method);
}

function sendEmpty(res) {
	res.send({empty:true});
}

function getUniques(schema) {
	var uniq = schema._uniques;

	if(!uniq) {
		uniq = [];
		_.each(schema.obj, (obj, key) => {
			if(obj.unique) uniq.push(key);
		});
		schema._uniques = uniq;
	}

	return uniq;
}

function getORsQuery(options, schema) {
	const uniqueData = _.pick(options.data, schema._uniques);
	const ORs = [];
	_.keys(uniqueData).forEach( key => {
		var obj = {};
		obj[key] = uniqueData[key];
		ORs.push(obj);
	});

	return {$or: ORs};
}

function onMongoConnected(err) {
	if(err) throw err;

	const api = $$$.routes.api;

	$$$.schemas = {};

	function onMongoReady() {
		wait( () => {
			$$$.emit('mongo-ready');
			$$$.emit('ready');
		} );
	}

	$$$.files.forEachJS($$$.paths.__mongoSchemas, (schemaFile, name) => {
		name = name.remove('model.').remove('.js');

		const schemaName = changeCase.title( name );
		const schemaDef = require(schemaFile)(mongoose);
		const schema = new Schema(schemaDef.schema);
		const plural = schemaDef.plural || (name + "s");

		schema._name = name;

		//For ALL components
		applyPlugins(schema);
		getUniques(schema);

		// Oh! If we have convenience-methods for this particular Schema, copy them over:
		if(schemaDef.methods) schema.methods = schemaDef.methods;

		//Finally, let's create our Model, so we can instantiate and use it:
		const Model = $$$.schemas[schemaName] = mongoose.model(schemaName, schema);
		const __modelRoute = '/' + name;
		const __modelRoutes = '/' + plural;

		Model._def = schemaDef;
		Model._whitelist = [].concat(MANDATORY_FIELDS, schemaDef.whitelist);
		Model._name = name;

		function getWhitelistProps(req, res, customWhitelist, required) {
			var reduced = _.pick(req.query, customWhitelist || Model._whitelist);
			var reducedLen = _.keys(reduced).length;

			if(reducedLen < _.keys(req.query).length) {
				return sendError(res, `Attempted to query "${name}" with illegal props!`);
			}

			if(required && !reducedLen) {
				return sendError(res, `${name}[${req.method}] requires some fields to query with.`);
			}
			return reduced;
		}

		function getSorted(options, mg) {
			return options.reverse ? mg.sort({$natural: -1}) : mg;
		}

		/*
		 Model.on('index', (err) => {
		 	if(err) throw err;
		 });
		 */

		const METHODS = {
			///////////////////////// ONE:

			GET_ONE(req, res, next, options) {
				const q = getWhitelistProps(req, res);
				if(!q) return;

				getSorted(options, Model.findOne(q)).exec()
					.then(data => {
						if (!data) return sendEmpty(res);
						res.send(data);
					})
					.catch(err => {
						return next()
					});
			},

			POST_ONE(req, res, next, options) {
				const illegalData = _.keys(_.pick(options.data, MANDATORY_FIELDS));
				if(illegalData.length) {
					return sendError(res, `Used illegal field(s) while adding to ${name}: ` + illegalData);
				}

				const uniqueOr = getORsQuery(options, schema);

				Model.findOne(uniqueOr).exec()
					.then(data => {
						if(!!data) return sendError("Data not unique!");

						const newUser = new Model(options.data);
						return newUser.save();
					})
					.then(data => {
						res.send(data);
					})
					.catch(err => {
						sendError(res, `Could not add ${name} in database: ` + err.message);
						//trace(err);
					});
			},

			PUT_ONE(req, res, next, options) {
				const q = getWhitelistProps(req, res, MANDATORY_FIELDS, true);
				if(!q) return;

				options.new = true;

				Model.findOneAndUpdate(q, {$set: options.data}, options, (err, data) => {
					if(err || data.n===0) {
						return sendError(res, `Could not update ${name} in database, verify query: ` + _.jsonPretty(q));
					}
					res.send(data);
				});
			},

			DELETE_ONE(req, res, next, options) {
				const q = getWhitelistProps(req, res, MANDATORY_FIELDS, true);
				if(!q) return;

				Model.remove(q).exec()
					.then(data => res.send(data))
					.catch(err => {
						sendError(res, `Could not remove ${name} with supplied queries: ` + _.keys(q));
					});
			},

			///////////////////////// MANY:

			GET_MANY(req, res, next, options) {
				const q = getWhitelistProps(req, res);
				if(!q) return;

				getSorted(options, Model.find(q)).exec()
					.then(data => res.send(data))
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
		api.use(__modelRoute + "$", modelRouter('_ONE'));
		api.use(__modelRoute + "/last", modelRouter('_ONE', {reverse:true}) );

		api.use(__modelRoutes + "$", modelRouter('_MANY'));
		api.use(__modelRoutes + '/count', (req, res, next) => {
			Model.count((err, count) => {
				if(err) return sendError(res, `Could not count model "${name}":\n`+err.message);
				res.send({count: count});
			})
		});


	}, onMongoReady);
}