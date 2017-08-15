/**
 * Created by Chamberlain on 8/11/2017.
 */
const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const changeCase = require('change-case');
const Schema = mongoose.Schema;

global.mongoose = mongoose;

mongoose.Promise = global.Promise;

module.exports = function mongoSetup() {
	const conn = mongoose.connect('mongodb://localhost:27017/sf-dev', onMongoConnected);

	autoIncrement.initialize(conn);
};

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

		// Oh! If we have convenience-methods for this particular Schema, copy them over:
		if(schemaDef.methods) {
			schema.methods = schemaDef.methods;
		}

		//For ALL components
		schema.plugin(autoIncrement.plugin, {
			model: schemaName,
			field: '_autoID',
			startAt: 0,
		});

		//Finally, let's create our Model, so we can instantiate and use it:
		const model = $$$.schemas[schemaName] = mongoose.model(schemaName, schema);
		const __modelRoute = '/' + name;
		const __modelRoutes = '/' + plural;

		trace("Add routes: " + __modelRoute + " & " + __modelRoutes);

		const METHODS = {
			///////////////////////// ONE:

			GET_ONE(model, req, res, next) {
				model.findOne().exec((err, data) => {
					res.send("GET ONE!!!");
				});
			},

			POST_ONE(model, req, res, next) {
				res.send("POST ONE!!!");
			},

			PUT_ONE(model, req, res, next) {
				res.send("PUT ONE!!!");
			},

			DELETE_ONE(model, req, res, next) {
				res.send("DELETE ONE!!!");
			},

			///////////////////////// MANY:

			GET_MANY(model, req, res, next) {
				//model.find()
				res.send("GET MANY!!!");
			},

			POST_MANY(model, req, res, next) {
				res.send("POST MANY!!!");
			},

			PUT_MANY(model, req, res, next) {
				res.send("PUT MANY!!!");
			},

			DELETE_MANY(model, req, res, next) {
				res.send("DELETE MANY!!!");
			},
		};

		function modelRouter(methodForm) {
			return (req, res, next) => {
				const methodName = req.method + methodForm;
				const method = METHODS[methodName];
				if(!method) {
					traceError("Oh no, bad method? " + methodName);
					return next();
				}

				method(model, req, res, next);
			}
		}

		// Add the singular & plural form of the router
		// They each do something different for each HTTP VERB types
		api.use(__modelRoute, modelRouter('_ONE'));
		api.use(__modelRoutes, modelRouter('_MANY'));

	}, onMongoReady);
}