require('./src/sv-globals');

var test = $$$.paths.__data + '/cron-jobs.json';

$$$.files.ensureDirExists(test)
	.then(() => trace("Made dir ok! " + test))
	.catch(err => traceError(err));