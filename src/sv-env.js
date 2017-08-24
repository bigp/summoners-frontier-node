const iniReader = require('ini');
const fs = require('fs');
const _ = global._ = require('lodash');

module.exports = function (privatePath) {
	const iniContent = fs.readFileSync(privatePath, 'utf-8');
	const iniJSON = iniReader.parse(iniContent);
	const ini = _.extend({PORT: 9000}, iniJSON);
	const NODE_ENV = ini.NODE_ENV || process.env.NODE_ENV || 'dev';

	function env(isEnv) {
		if(!arguments.length) return NODE_ENV;
		return NODE_ENV===isEnv;
	}

	//Expose a "_ini" field to make it shareable on Vue-based / Webpack Configuration files:
	process.env = _.extend(env, {ini: ini});

	if(ini.HTTPS) {
		process.env.HTTP_TYPE = ini.HTTPS.ENABLED ? "https" : "http";
		
		if(_.isTruthy(ini.HTTPS.ALLOW_SELF_SIGNED)) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
		}
	}


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
