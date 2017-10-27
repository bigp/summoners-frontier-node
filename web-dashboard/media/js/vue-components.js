/**
 * Created by Chamberlain on 10/27/2017.
 */

function wrapInDivs(comp, className) {
	$(comp.$el.children).wrap(`<div class="${className}"></div>`);
}

export default {
	'btn': {
		props: ['icon'],

		template: `<i :class="'fa fa-'+icon"></i> <slot></slot>`
	},

	'menubar': {
		mounted() {
			trace("Menubar mounted!");
		},
		template: `<slot></slot>`
	},

	'hbox': {
		mounted() {
			wrapInDivs(this, 'child hbox-child');
		},
		template: `<slot></slot>`
	},

	'vbox': {
		mounted() {
			wrapInDivs(this, 'child vbox-child');
		},
		template: `<slot></slot>`
	}
};