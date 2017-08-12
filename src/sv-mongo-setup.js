/**
 * Created by Chamberlain on 8/11/2017.
 */
// const mongo_express = require('mongo-express/lib/middleware');
// const mongoConfig = require($$$.paths.__private + '/mongo-config');

const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const changeCase = require('change-case');
const Schema = mongoose.Schema;

module.exports = function mongoSetup() {

	//$$$.app.use('/mongo-express', mongo_express(mongoConfig));

	var conn = mongoose.connect('mongodb://localhost:27017/sf-dev');
	autoIncrement.initialize(conn);

	$$$.schemas = {};

	$$$.files.filter($$$.paths.__mongoSchemas, /\.js/, (err, files, names) => {
		files.forEach( (schemaFile, s) => {
			const schemaName = changeCase.title( names[s].remove('.js') );

			const schemaModule = require(schemaFile);
			const schemaDefinition = schemaModule(Schema); //Execute our module to obtain a {schema JSON-object}
			const schema = new Schema(schemaDefinition);

			// Oh! If we have convenience-methods for this particular Schema, copy them over:
			if(schemaModule.methods) {
				schema.methods = schemaModule.methods;
			}

			//Finally, let's create our Model, so we can instantiate and use it:
			schema.plugin(autoIncrement.plugin, {
				model: schemaName,
				field: 'id',
				startAt: 0,
			});

			const model = $$$.schemas[schemaName] = mongoose.model(schemaName, schema);
		});


		wait( () => $$$.emit('mongo-ready') );
	});

	$$$.on('mongo-ready', () => {
		const User = $$$.schemas.User;
		var Pierre;
		if(false) {
			Pierre = new User({
				name: "Pierre",
				email: "chamberlainpi@gmail.com"
			});

			Pierre.save( (err) => {
				if(err) throw err;

				trace("Saved PIERRE ok.");
			})
		} else {
			trace("One...");
			User.findOne().exec((err, data) => {

				trace(err);
				trace(data);
			});
			return;
		}

		trace(Pierre.toObject());

		//Pierre.name = "Pierre";
		//Pierre.save && Pierre.save();

	});
};