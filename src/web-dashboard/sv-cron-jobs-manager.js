/**
 * Created by Chamberlain on 10/30/2017.
 */
const events = require('events');
const later = require('later');
var JOBS = [];

const CronJobsManager = new events();

_.extend(CronJobsManager, {
	validateJobs(jobsData, errors) {
		var isValid = true;
		function nope(because) {
			errors.push(because);
			isValid = false;
		}

		jobsData.forEach(job => {
			if(!job.id) nope("Missing Job ID #.");
			if(!CronJobsManager.resolveJobType(job)) nope("Invalid Job Type: " + job.type);
			if(!job.title || !job.title.trim().length) nope("Missing Job title.");
			if(!job.message || !job.message.trim().length) nope("Missing Job Message.");
			if(!job.schedule || !job.schedule.trim().length) nope("Missing Job Schedule.");

			const cronSchedule = later.parse.text(job.schedule);

			if(!cronSchedule || cronSchedule.error>-1) {
				nope("Error in Schedule field at character " + cronSchedule.error);
			}
		});

		return isValid;
	},

	checkAll(data) {
		var jobsNew = data.cronJobs;

		jobsNew.forEach( jobNew => {
			var job = JOBS.find( j => j.id===jobNew.id );

			if(!job) return CronJobsManager.startJob(jobNew);

			if(job.dateChanged===jobNew.dateChanged) {
				return;
			}

			CronJobsManager.updateJob(job, jobNew);
		});

		//Remove any jobs that are no longer active:
		JOBS.forEach( job => {
			var found = jobsNew.find(j => j.id===job.id);
			if(found) return;

			CronJobsManager.stopJob(job);
		});
	},

	startJob(jobNew) {
		trace("Starting job: ".yellow + jobNew.id);
		JOBS.push(jobNew);

		CronJobsManager.updateJob(jobNew);
	},

	updateJob(job, jobNew) {
		trace("Updating job: ".green + job.id);

		if(jobNew) _.merge(job, jobNew);

		CronJobsManager.stopJob(job);

		if(!job.isActive) {
			return trace("Job is NOT active.".bgRed);
		}

		const cronSchedule = later.parse.text(job.schedule);
		if(cronSchedule.error>-1) {
			return traceError('Could not start the new job with the schedule expression: ' + job.schedule);
		}

		job._count = 0;
		job._cron = later.setInterval(() => CronJobsManager.onJobExecute(job), cronSchedule);

		if(job.isExecuteOnStart) {
			CronJobsManager.onJobExecute(job);
		}
	},

	onJobExecute(job) {
		const typeMethod = CronJobsManager.resolveJobType(job);
		if(!typeMethod) return;

		//////////////////////////////////////

		if(job.limit>-1 && (++job._count)>=job.limit) {
			CronJobsManager.stopJob(job);
		}
	},

	resolveJobType(job) {
		var type = job.type.toUpperCase().replace(/ /g, '_');
		return CronJobsManager.JOB_TYPES[type];
	},

	stopJob(job) {
		if(!job._cron || !job._cron.clear) return;

		job._cron.clear();
		job._cron = null;
	},

	JOB_TYPES: {
		GENERIC_MESSAGE(job) {

		},

		LOOTCRATE_REWARD(job) {

		},

		CURRENCY_REWARD(job) {

		}
	}
});

module.exports = CronJobsManager;