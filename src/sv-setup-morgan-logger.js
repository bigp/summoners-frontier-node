/**
 * Created by Chamberlain on 8/23/2017.
 */

const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const rfs = require('rotating-file-stream');

function pad(str, width, z, after) {
	if(str.length >= width) return str;
	z = z || '0';
	const zzz = new Array(width - str.length + 1).join(z);
	if(after) return str + zzz;

	return zzz + str;
}

const format = ':date[iso]  FROM: :remote-addr  TIME: :padded-time  AUTH: :req[authorization]  URL: :url [:method] :is-error';

module.exports = {
	morgan: morgan,
	setupLogger(app) {
		const stream = rfs('morgan.log', {
			size:     '10M',	// rotate every 10 MegaBytes written
			interval: '1d', 	// rotate daily
			compress: 'gzip',	// compress rotated files
			path: $$$.paths.__private + '/logs/'
		});

		morgan.token('padded-time', function(req, res, digits) {
			if(!digits) digits = 10;
			const time = this['response-time'](req, res) + ' ms';
			return pad(time, digits, '_');
		});

		morgan.token('is-error', function(req, res) {
			if(res.statusCode===200) return ' ';
			return `*ERROR* ${res.statusCode} - ${res.statusMessage}`;
		});

		const skipFunc = _.isTruthy(process.env.MORGAN_ERRORS_ONLY) ?
							(req, res) => res.statusCode===200 :
							null;

		app.use(morgan(format, {stream: stream, skip: skipFunc}));
	}
};

