/**
 * Created by Chamberlain on 10/27/2017.
 */
const webdash = $$$.webdash = {};
const fs = require('fs-extra');

function setupWebDashboard() {
	trace("WEB-DASHBOARD: ".yellow + "Init.");

	webdash.io = $$$.io.of('/web-dashboard');

	webdash.__public = $$$.paths.__dir + '/web-dashboard';
	webdash.__cronJobs = $$$.paths.__data + '/cron-jobs.json';

	$$$.files.ensureDirExists(webdash.__cronJobs);

	if(fs.existsSync(webdash.__cronJobs)) {
		loadCronJobs()
			.then(data => webdash.JSON_DATA = data);
	} else {
		webdash.JSON_DATA = {
			cronJobs:[]
		};
	}

	webdash.route = $$$.express.Router();

	if($$$.isDev) {
		prepareHotReload();
	}

	webdash.route.use('/', $$$.express.static(webdash.__public));
	webdash.route.use('/public', $$$.express.static($$$.paths.__public));
	webdash.route.use('/json/*', (req, res, next) => {
		res.header('content-type', 'application/json');

		next();
	});

	webdash.route.use('/json/cron-jobs', (req, res, next) => {
		if(!webdash.JSON_DATA) {
			return $$$.send.error(res, 'CRON-Jobs JSON isn\'t loaded yet.');
		}

		switch(req.method) {
			case 'GET': {
				res.send(webdash.JSON_DATA);
				break;
			}
			case 'POST': {
				webdash.JSON_DATA.cronJobs = req.body;

				$$$.files.writeJSON(webdash.__cronJobs, webdash.JSON_DATA)
					.then(() => res.send({ok:1}))
					.catch(err => {
						$$$.send.error(res, 'Could not write the CRON-JOBS JSON data.');
					});

				break;
			}
			default: {
				return $$$.send.error(res, 'Unsupported method for /cron-jobs');
			}
		}
	});

	$$$.app.use('/web-dashboard', webdash.route);
}

function loadCronJobs() {
	trace("Load CRON Jobs...");
	return $$$.files.readJSON(webdash.__cronJobs);
}

function prepareHotReload() {
	const wp = require('webpack');
	const MemoryFS = require('memory-fs');
	const memFS = new MemoryFS();
	const wpConfig = require('../web-dashboard/webpack.config');
	const wpCompiler = wp(wpConfig);
	const path = require('path');

	wpCompiler.outputFileSystem = memFS;

	function wpRecompile(path) {
		wpCompiler.run(done => {
			webdash.io.emit('reload', path);
		});
	}

	$$$.addWatcher('web-dashboard/**', path => {
		if(path.has('bundle.js')) {
			return trace("Bundle updated.");
		}

		traceError(path);

		wpRecompile(path);
	});

	wpRecompile();

	webdash.route.use('/dist/*', (req, res, next) => {
		var filepath = webdash.__public + req.baseUrl.replace('web-dashboard/', '');

		if(!memFS.existsSync(filepath)) {
			return res.status(404).send('Webpack resource not found in /dist: ' + filepath);
		}

		var content = memFS.readFileSync(filepath, 'utf8');
		res.send(content);
	});
}

module.exports = setupWebDashboard;