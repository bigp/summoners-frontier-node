const ini = require('ini');
const fs = require('fs');
const _ = global._ = require('lodash');

module.exports = function (privatePath) {
	const iniContent = fs.readFileSync(privatePath, 'utf-8');
	const iniJSON = ini.parse(iniContent);
	const _ENV = _.extend({}, {PORT: 9000}, iniJSON, process.env);
	const _NODE_ENV = _ENV.NODE_ENV || 'dev';

	function env(isEnv) {
		if(arguments.length===0) return _NODE_ENV;
		return _NODE_ENV===isEnv;
	}

	//Expose a "INI_ONLY" field to make it shareable on Vue-based / Webpack Configuration files:
	process.env = _.extend(env, _ENV, {INI_ONLY: iniJSON});

	const iniProxy = new Proxy(env, {
		get(target, name, receiver) {
			if(target[name]==null && typeof(name)!=='symbol' && name!=='inspect') { //&& name!=='length'
				throw new Error(`Unknown property accessed in INI data "${name}"`);
			}
			return target[name];
		}
	});

	return iniProxy;
};
