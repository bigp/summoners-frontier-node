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

$$$.vue = new Vue({
	el: '#app',
	data: {
		currentJob: {
			jobType: 'Generic Message'
		}
	}
});