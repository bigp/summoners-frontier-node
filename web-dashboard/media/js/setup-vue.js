var trace = window.trace.makeLogger('VUE', '#0a4');

import vSelect from 'vue-select';
import MyComponents from './vue-components.js';

function registerComponents(comps) {
	_.keys(comps).forEach(compName => {
		var comp = MyComponents[compName];

		if(!comp.noDiv) {
			comp.template = `<div class="${compName}">${comp.template}</div>`;
		}


		var MyComp = Vue.extend(comp);

		Vue.component(compName, MyComp);
	});
}

registerComponents(MyComponents);

Vue.component('v-select', vSelect);

var __CRON_JOBS, __SPINNER;

function loadCronJobs() {
	__SPINNER.startBusy(0.5, 0.5, () => {
		_.loadJSON('./json/cron-jobs')
			.then(data => {
				__SPINNER.stopBusy();

				if(!data || !data.cronJobs) {
					return _.alert('JSON data is invalid!', 'Missing CRON Jobs!');
				}

				__CRON_JOBS = $$$.vue.cronJobs = data.cronJobs;

				if(__CRON_JOBS && __CRON_JOBS.length>0) {
					$$$.vue.currentJob = __CRON_JOBS[0];
				}
			})
			.catch(err => {
				__SPINNER.stopBusy();
			})
	});
}

function init() {
	$$$.vue = new Vue({
		el: '#app',
		props: ['currentJob'],
		data: {
			cronJobs: []
		},

		methods: {
			getJobClasses(job) {
				return ['job', 'job-' + job.id, this.currentJob===job ? 'selected' : ''];
			},

			getToggleIcon(prop, job) {
				if(!job) job = this.currentJob;
				return job[prop] ? 'circle is-on' : 'circle-o is-off';
			},

			getPublishedDate(job) {
				if(!job) job = this.currentJob;
				var date = new Date(job.published.dateLast);
				return job.published.dateLast ? date.toLocaleString() : '';
			},

			onToggle(prop, job) {
				if(!job) job = this.currentJob;
				job[prop] = !job[prop];
				this.onSave(job);
			},

			onJobSelected(job) {
				this.currentJob = job;
			},

			onJobAdd() {
				var numJobs = __CRON_JOBS.length;
				var job = {
					id: _.guid(),
					name: 'Job #' + numJobs,
					isActive: false,
					dateChanged: new Date(),
					dateActiveSince: new Date(),
					published: {
						numTotal: 0,
						dateLast: null,
					},
					schedule: 'Every 2 seconds',
					dateExpiresIn: '1 day',
					title: 'YOUR_TITLE_HERE ' + numJobs,
					message: 'YOUR_MESSAGE_HERE ' + numJobs,
					imageURL: 'sword-ref',
					type: 'Generic Message'
				};

				__CRON_JOBS.push( job );
				this.currentJob = job;

				this.onSave();
			},

			onSave(job) {
				if(!job) job = this.currentJob;

				if(job) {
					job.dateChanged = new Date();
				}

				__SPINNER.startBusy(0.5, 0.250, () => {
					_.writeJSON('./json/cron-jobs', __CRON_JOBS)
						.then(data => {
							__SPINNER.stopBusy();
						})
						.catch(err => {
							__SPINNER.stopBusy();
						});
				})
			},

			onDelete() {
				var id = this.currentJob.id;
				var found = __CRON_JOBS.find(job => job.id===id);
				__CRON_JOBS.remove(found);

				this.onSave();

				if(__CRON_JOBS.length>0) {
					this.currentJob = __CRON_JOBS[0];
				} else {
					this.currentJob = null;
				}
			},

			onSendDM() {

			},
		}
	});

	$('.init-hidden').removeClass('init-hidden');

	__SPINNER = new Spinner();

	loadCronJobs();
}

init();
