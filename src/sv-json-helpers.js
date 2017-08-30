/**
 * Created by Chamberlain on 8/30/2017.
 */

module.exports = {
	getItems() {
		const jsonLoader = $$$.jsonLoader;
		const jsonSheets = jsonLoader.data.sheets;

		return {
			weapon: jsonSheets['item-weapons'].data,
			armor: jsonSheets['item-armors'].data,
			relic: jsonSheets['item-relics'].data
		};
	},

	getHeroes() {
		const jsonLoader = $$$.jsonLoader;
		const jsonSheets = jsonLoader.data.sheets;

		return jsonSheets.heroes;
	},

	getJSONGlobals(preset) {
		if(!preset) preset = 'preset-1';

		return $$$.jsonLoader.globals[preset];
	}
}