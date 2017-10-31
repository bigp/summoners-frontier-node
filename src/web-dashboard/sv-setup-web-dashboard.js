/**
 * Created by Chamberlain on 10/27/2017.
 */
const webdash = $$$.webdash = {};
const fs = require('fs-extra');
const CronJobsManager = require('./sv-cron-jobs-manager');

function setupWebDashboard() {
	trace("WEB-DASHBOARD: ".yellow + "Init.");

	webdash.io = $$$.io.of('/web-dashboard');

	webdash.__public = $$$.paths.__dir + '/web-dashboard';
	webdash.__cronJobs = $$$.paths.__data + '/cron-jobs.json';

	$$$.files.ensureDirExists(webdash.__cronJobs);

	if(fs.existsSync(webdash.__cronJobs)) {
		$$$.files.readJSON(webdash.__cronJobs)
			.then(data => {
				webdash.JSON_DATA = data;
			});
	} else {
		webdash.JSON_DATA = {
			cronJobs:[]
		};
	}

	var i = setInterval(function startAllJobs() {
		if(!webdash.JSON_DATA) return;

		clearInterval(i);

		trace("Starting all CRON-JOBS:".bgGreen + ' ' + webdash.JSON_DATA.cronJobs.length);
		CronJobsManager.checkAll(webdash.JSON_DATA);
	}, 2000);

	webdash.route = $$$.express.Router();

	if($$$.isDev) {
		require('./sv-webpack-hot-reload')(webdash);
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
				var reasonsInvalid = [];
				if(!CronJobsManager.validateJobs(req.body, reasonsInvalid)) {
					return $$$.send.error(res, 'Some jobs are invalid: ' + reasonsInvalid.join('\n<br/>'));
				}

				webdash.JSON_DATA.cronJobs = req.body;

				CronJobsManager.checkAll(webdash.JSON_DATA);

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

module.exports = setupWebDashboard;