/**
 * Created by Chamberlain on 10/27/2017.
 */
const webdash = $$$.webdash = {};
const fs = require('fs-extra');
const CronJobsManager = require('./sv-cron-jobs-manager');

function setupWebDashboard() {
	trace("WEB-DASHBOARD: ".yellow + "Init.");

	//Create a Socket.IO namespace reserved for the web-dashboard:
	webdash.io = $$$.io.of('/web-dashboard');

	webdash.__public = $$$.paths.__dir + '/web-dashboard';
	webdash.__cronJobs = $$$.paths.__data + '/cron-jobs.json';

	loadJSONData()
		.then(startAllJobs);

	webdash.route = $$$.express.Router();

	if($$$.isDev) require('./sv-webpack-hot-reload')(webdash);

	webdash.route.use('/', $$$.express.static(webdash.__public));
	webdash.route.use('/public', $$$.express.static($$$.paths.__public));
	webdash.route.use('/json/*', (req, res, next) => {
		res.header('content-type', 'application/json');
		next();
	});

	webdash.route.use('/json/cron-jobs', (req, res, next) => {
		if(webdash.JSON_DATA) return next();
		$$$.send.error(res, 'CRON-Jobs JSON isn\'t loaded yet.');
	});

	webdash.route.get('/json/cron-jobs', (req, res, next) => {
		res.send(webdash.JSON_DATA);
	});

	webdash.route.post('/json/cron-jobs', (req, res, next) => {
		const reasonsInvalid = [];

		if(!CronJobsManager.validateJobs(req.body, reasonsInvalid)) {
			return $$$.send.error(res, 'Some jobs are invalid: ' + reasonsInvalid.join('\n<br/>'));
		}

		webdash.JSON_DATA.cronJobs = req.body;

		CronJobsManager.checkAll(webdash.JSON_DATA);

		$$$.files.writeJSON(webdash.__cronJobs, webdash.JSON_DATA, true)
			.then(() => res.send({ok:1}))
			.catch(err => {
				$$$.send.error(res, 'Could not write the CRON-JOBS JSON data.');
			});
	});

	$$$.app.use('/web-dashboard', webdash.route);

	CronJobsManager.on('job-published', job => {
		webdash.io.emit('job-published', job);
	})
}

function loadJSONData() {
	return new Promise((resolve, reject) => {
		$$$.files.ensureDirExists(webdash.__cronJobs);

		if(fs.existsSync(webdash.__cronJobs)) {
			$$$.files.readJSON(webdash.__cronJobs)
				.then(data => {
					webdash.JSON_DATA = data;
					resolve();
				});
		} else {
			webdash.JSON_DATA = { cronJobs:[] };
			resolve();
		}
	})
}

function startAllJobs() {
	trace("Starting all CRON-JOBS:".bgGreen + ' ' + webdash.JSON_DATA.cronJobs.length);
	CronJobsManager.checkAll(webdash.JSON_DATA);
}


module.exports = setupWebDashboard;