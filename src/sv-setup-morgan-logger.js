/**
 * Created by Chamberlain on 8/23/2017.
 */

const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const rfs = require('rotating-file-stream');
const EOL = require('os').EOL;

function pad(str, width, z, after) {
	if(str.length >= width) return str;
	z = z || '0';
	const zzz = new Array(width - str.length + 1).join(z);
	if(after) return str + zzz;

	return zzz + str;
}

function createLog(filename) {
	return rfs(filename, {
		size:     '10M',	// rotate every 10 MegaBytes written
		interval: '1d', 	// rotate daily
		compress: 'gzip',	// compress rotated files
		path: $$$.paths.__private + '/logs/'
	})
}

const format = ':date[iso]  FROM: :remote-addr  TIME: :padded-time  AUTH: :req[authorization]  URL: :url [:method] :is-error';

const morganStream = createLog('morgan.log');
const errorStream = createLog('errors.log');

module.exports = {
	_morgan: morgan,
	_morganStream: morganStream,
	_errorStream: errorStream,

	_write(msg) { errorStream.write(msg + EOL); },
	error(msg) { this._write("ERROR: " + msg); },
	warn(msg) { this._write("WARN: " + msg); },
	info(msg) { this._write("INFO: " + msg); },

	setupLogger(app) {
		morgan.token('padded-time', function(req, res, digits) {
			if(!digits) digits = 10;
			const time = this['response-time'](req, res) + ' ms';
			return pad(time, digits, '_');
		});

		morgan.token('is-error', function(req, res) {
			if(res.statusCode<200) return ' ';
			return `*ERROR* ${res.statusCode} - ${res.statusMessage}`;
		});

		const skipFunc = _.isTruthy(process.env.MORGAN_ERRORS_ONLY) ?
							(req, res) => res.statusCode<400 :
							null;

		app.use(morgan(format, {stream: morganStream, skip: skipFunc}));
	}
};

