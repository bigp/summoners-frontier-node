/**
 * Created by Chamberlain on 8/15/2017.
 */
const mongoose = require('mongoose');
const changeCase = require('change-case');
const autoIncrement = require('mongoose-auto-increment');
const beautifulUnique = require('mongoose-beautiful-unique-validation');
const MANDATORY_FIELDS = ['_id', 'id'];
const ERROR_MAXLENGTH = '`{PATH}` field must be {MAXLENGTH} chars, you used {VALUE}.';
const PRIVATE_PROP = /^_/;

mongoose.Promise = global.Promise;
mongoose.CustomTypes = {
	Number: (opt) => _.extend({type: Number, default:0, min: 0, max: 10000}, opt),
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

			if(_.isPlainObject(value)) {
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

		$$$.send.error(res, `Can only use ${req.url} with '${shouldBeVerb}' HTTP Verb, you used '${req.method}'.`);

		return true;
	},

	authenticateUser(req, res, next) {
		const USERAUTH_ERROR = (err) => $$$.send.errorCustom(res, err, "User Authentication Failed");

		return new Promise((resolve, reject) => {
			if(!req.auth || !(req.auth.isAdmin || req.auth.isAuth)) {
				return USERAUTH_ERROR("Request missing OR has incorrect Authorization key.");
			}

			const authCodes = req.auth.codes;
			if(authCodes.length<3) {
				return USERAUTH_ERROR("Request missing parts of Authorization to determine username & token");
			}

			const username = authCodes[1];
			const token = authCodes[2];

			$$$.models.User.findOne({username: username}).exec()
				.then( found => {
					if(!found) throw `'${username}' not found.`;
					if(!found.login.token) throw `'${username}' not logged in.`;
					if(found.login.token!==token) throw `'${username}' token doesn't match`;

					req.isUser = true;
					req.auth.user = found;

					found.login.datePing = new Date();
					return found.save();
				})
				.then( found => {
					resolve(found);
				})
				.catch( err => {
					USERAUTH_ERROR(err);
				});
		});
	}
};

module.exports = mgHelpers;