/**
 * Created by Chamberlain on 8/30/2017.
 */

module.exports = {
	getJSONItems() {
		const jsonLoader = $$$.jsonLoader;
		const jsonSheets = jsonLoader.data.sheets;

		return {
			weapon: jsonSheets['item-weapons'].data,
			armor: jsonSheets['item-armors'].data,
			relic: jsonSheets['item-relics'].data
		};
	},

	getJSONGlobals(preset) {
		if(!preset) preset = 'preset-1';

		return $$$.jsonLoader.globals[preset];
	}
}