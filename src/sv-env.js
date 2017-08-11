module.exports = function (paths) {
	const dotenv = require('dotenv').config({path: paths.__private + '/env.ini'});
	const fs = require('fs-extra');

	const _ENV = process.env;
	const _NODE_ENV = _ENV.NODE_ENV || 'dev';

	function env(isEnv) {
		if(arguments.length===0) return _NODE_ENV;
		return _NODE_ENV===isEnv;
	}

	_.extend(env, {PORT: 9000}, _ENV);

	return env;
};
