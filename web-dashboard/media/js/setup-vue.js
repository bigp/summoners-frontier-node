var trace = window.trace.makeLogger('VUE', '#0a4');

import vSelect from 'vue-select';
import MyComponents from './vue-components.js';

function registerComponents(comps) {
	_.keys(comps).forEach(compName => {
		var comp = MyComponents[compName];
		comp.template = `<div class="${compName}">${comp.template}</div>`;

		var MyComp = Vue.extend(comp);

		Vue.component(compName, MyComp);
	});
}

registerComponents(MyComponents);

Vue.component('v-select', vSelect);

var __CRON_JOBS;

$$$.vue = new Vue({
	el: '#app',
	props: ['currentJob'],
	data: {
		cronJobs: []
	},

	methods: {
		onJobSelected(job) {
			this.currentJob = job;
		},

		onJobAdd() {
			var job = {
				id: _.guid(),
				name: 'Job #' + __CRON_JOBS.length,
				published: {
					numTotal: 0,
					dateLast: null,
				},
				schedule: 'Every day 8:00AM',
				title: 'YOUR_TITLE_HERE',
				message: 'YOUR_MESSAGE_HERE',
				image: 'sword-ref',
				type: 'Generic Message'
			};

			__CRON_JOBS.push( job );
			this.currentJob = job;

			this.onSave();
		},

		onSave() {
			_.writeJSON('./json/cron-jobs', __CRON_JOBS)
				.then(data => {
					if(!data || !data.ok) {
						return;
					}

					_.alert('Saved OK!', 'The CRON-JOBS JSON was successfully saved.');
				});
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

_.loadJSON('./json/cron-jobs')
	.then(data => {
		if(!data || !data.cronJobs) {
			return _.alert('JSON data is invalid!', 'Missing CRON Jobs!');
		}

		__CRON_JOBS = $$$.vue.cronJobs = data.cronJobs;

		if(__CRON_JOBS && __CRON_JOBS.length>0) {
			$$$.vue.currentJob = __CRON_JOBS[0];
		}
	});