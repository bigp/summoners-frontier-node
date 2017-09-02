/**
 * Created by Chamberlain on 8/15/2017.
 */
const mongoose = require('mongoose');
const NumberInt = require('mongoose-int32');
const changeCase = require('change-case');
const autoIncrement = require('mongoose-auto-increment');
const beautifulUnique = require('mongoose-beautiful-unique-validation');
const MANDATORY_FIELDS = ['_id', 'id'];
const ERROR_MAXLENGTH = '`{PATH}` field must be {MAXLENGTH} chars, you used {VALUE}.';
const PRIVATE_PROP = /^_/;
const CONFIG = $$$.env.ini;


mongoose.Promise = global.Promise;
mongoose.CustomTypes = {
	Int: (opt) => _.extend({type: NumberInt, default:0, min: 0, max: 10000}, opt),
	Number: (opt) => _.extend({type: Number, default:0, min: 0, max: 10000}, opt),
	LargeInt: (opt) => _.extend({type: NumberInt, default:0, min: 0, max: 2000000000}, opt),
	String32: (opt) => _.extend({type: String, trim: true, maxlength: [32, ERROR_MAXLENGTH]}, opt),
	String128: (opt) => _.extend({type: String, trim: true, maxlength: [128, ERROR_MAXLENGTH]}, opt),
	String256: (opt) => _.extend({type: String, trim: true, maxlength: [256, ERROR_MAXLENGTH]}, opt),
	DateRequired: (opt) => _.extend({type: Date, required: true, default: () => new Date()}, opt),
};

const mgHelpers = {
	MANDATORY_FIELDS: MANDATORY_FIELDS,
	mongoose: mongoose,

	plugins: {
		autoIncrement,
		beautifulUnique
	},

	createModel(schemaFile, name) {
		const schemaReq = require(schemaFile);
		if(!_.isFunction(schemaReq)) {
			traceError("In Model: " + schemaFile);
			throw new Error("Mongoose Models should be defined correctly (return a function!)");
		}

		trace("Creating model: ".yellow + name);

		const schemaDef = schemaReq(mongoose);
		const schema = new mongoose.Schema(schemaDef.schema);

		this.applyPlugins(schema, name);

		// Oh! If we have convenience-methods for this particular Schema, copy them over:
		if(schemaDef.methods) schema.methods = schemaDef.methods;

		const Model = mongoose.model(name, schema);

		Model._def = schemaDef;
		Model._name = name;
		Model._nameTitled = changeCase.title(name);
		Model._plural = schemaDef.plural || (name + "s");
		Model._uniques = this.getUniques(schema);
		Model._whitelist = [].concat(this.MANDATORY_FIELDS, schemaDef.whitelist);
		Model.__route = '/' + name;
		Model.__routes = '/' + Model._plural;

		return Model;
	},

	applyPlugins(schema, name) {
		schema.plugin(beautifulUnique);
		schema.plugin(autoIncrement.plugin, {
			model: name,
			field: 'id',
			type: NumberInt,
			startAt: 1,
		});
	},

	getUniques(schema) {
		const uniq = [];
		_.each(schema.obj, (obj, key) => {
			if(obj.unique) uniq.push(key);
		});

		return uniq;
	},

	getIllegals(options) {
		return _.keys(_.pick(options.data, MANDATORY_FIELDS))
	},

	getORsQuery(obj, uniques) {
		const uniqueData = uniques ? _.pick(obj, uniques) : obj;

		const ORs = [];
		_.keys(uniqueData).forEach( key => {
			if(uniqueData[key]==null) return;
			const obj = {};
			obj[key] = uniqueData[key];
			ORs.push(obj);
		});

		return {$or: ORs};
	},

	getWhitelistProps(Model, req, res, customWhitelist, required) {
		const reduced = _.pick(req.query, customWhitelist || Model._whitelist);
		const reducedLen = _.keys(reduced).length;

		if(reducedLen < _.keys(req.query).length) {
			return $$$.send.error(res, `Attempted to query "${Model._name}" with illegal props!`);
		}

		if(required && !reducedLen) {
			return $$$.send.error(res, `${Model._name}[${req.method}] requires some fields to query with.`);
		}
		return reduced;
	},

	getSorted(options, mg) {
		return options.reverse ? mg.sort({$natural: -1}) : mg;
	},

	isPrivateField(name) {
		return PRIVATE_PROP.test(name);
	},

	//Recursively filters any "_..." prefixed property:
	filterMongoPrivateData(data) {
		if(_.isArray(data)) {
			return data.map(mgHelpers.filterMongoPrivateData);
		}

		const dup = {};
		const source = data.toJSON ? data.toJSON() : data;

		_.keys(source).forEach((key) => {
			if(mgHelpers.isPrivateField(key)) return;

			const value = source[key];

			if(_.isPlainObject(value) || _.isArray(value) || (value && value._doc)) {
				return dup[key] = mgHelpers.filterMongoPrivateData(value);
			}

			dup[key] = value;
		});

		return dup;
	},

	sendFilteredResult(res, data) {
		var filteredData = this.filterMongoPrivateData(data);

		$$$.send.result(res, filteredData);
	},

	isWrongVerb(req, res, shouldBeVerb) {
		if(req.method===shouldBeVerb) return false;

		//$$$.send.error // new Error(
		throw `Can only use ${req.url} with '${shouldBeVerb}' HTTP Verb, you used '${req.method}'.`;

		return true;
	},

	ifHasUniquesCheckFirst(Model, req, res, next, options) {
		const uniqueOr = mgHelpers.getORsQuery(options.data, Model._uniques);
		if(options.noQuery || !uniqueOr.length) {
			return Promise.resolve();
		}

		if(Model._uniques.length > 0 && uniqueOr && !uniqueOr.$or.length) {
			return $$$.send.error(res, 'Missing required fields.', options.data);
		}

		return Model.find(uniqueOr).exec()
			.then(data => {
				if (data && data.length > 0) {
					if(Model._nameTitled==="Item") {
						trace(data);
						trace(options.data);
					}

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
			});
	},

	isValidationError(err, res, errMessage) {
		if(!err || !err.message || !err.message.has('validation')) return false;
		if(!errMessage) errMessage = "Validation Error occurred.";

		const errors = [];

		_.keys(err.errors).forEach(key => {
			var reason = err.errors[key].message;
			if(reason.has('is required.')) {
				reason = reason.replace("Path", "Field");
			}

			errors.push( reason );
		});

		$$$.send.error(res, {message: errMessage, reasons: errors});

		return true;
	},

	prepareRandomCountRequest(Model, req, res, next, generatorWithUser) {
		return new Promise((resolve, reject) => {
			if (mgHelpers.isWrongVerb(req, res, 'POST')) return;

			const user = req.auth.user;

			var count = req.params.count || 1;
			if (count > CONFIG.GAME_RULES.MAX_RANDOM_COUNT) {
				throw `Random "count" parameter too high: ${count} in "${req.fullURL}"`;
			}

			var results = [];
			for(var c=0; c<count; c++) {
				results.push( generatorWithUser(user) );
			}

			resolve( Model.create(results) );
		});
	},

	findAllByCurrentUser(Model, req, res, next, opts) {
		return new Promise((resolve, reject) => {
			if (mgHelpers.isWrongVerb(req, res, 'GET')) return;

			const q = _.extend({userId: req.auth.user.id}, opts.query);

			resolve( Model.find(q).sort('id') )
		});
	},

	prepareAddRequest(Model, req, res, next, opts) {
		return new Promise((resolve, reject) => {
			if (mgHelpers.isWrongVerb(req, res, 'POST')) return;

			if (!opts.data || !opts.data.list || !opts.data.list.length) {
				throw `Must provide a *list* of '${Model._plural}' to add.`;
			}

			resolve(req.auth.user);
		});
	},

	sendNewestAndOldest(res, newest, oldest) {
		return mgHelpers.sendFilteredResult(res, {
			newest: newest ? _.sortBy(newest, 'id') : null,
			oldest: oldest ? _.sortBy(oldest, 'id') : null
		});
	}
};

module.exports = mgHelpers;