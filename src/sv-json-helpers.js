/**
 * Created by Chamberlain on 8/30/2017.
 */

module.exports = {
	getItems() {
		const jsonLoader = $$$.jsonLoader;
		const jsonSheets = jsonLoader.data.sheets;

		const weapons = jsonSheets['item-weapons'].data;
		const armor = jsonSheets['item-armors'].data;
		const relic = jsonSheets['item-relics'].data;
		const allItems = [].concat(weapons, armor, relic);
		const allIdentities = allItems.map(item => item.identity);
		const allNames = allItems.map(item => item.name);

		return {
			weapon: weapons,
			armor: armor,
			relic: relic,

			all: {
				items: allItems,
				identities: allIdentities,
				names: allNames
			}
		};
	},

	getHeroes() {
		const jsonLoader = $$$.jsonLoader;
		const jsonSheets = jsonLoader.data.sheets;
		const jsonHeroes = jsonSheets['heroes'].data;

		var dup = [].concat(jsonHeroes);
		dup.all = {
			identities: jsonHeroes.map(hero => hero.identity),
			names: jsonHeroes.map(hero => hero.name)
		};

		return dup;
	},

	getJSONGlobals(preset) {
		if(!preset) preset = 'preset-1';

		return $$$.jsonLoader.globals[preset];
	},

	// makeItemSchema() {
	// 	return {
	// 		identity: CustomTypes.String128({required:true}),
	// 		heroEquipped: CustomTypes.Number({default: 0}),
	// 		randomSeeds: {
	// 			quality: CustomTypes.Number({default: 1}),
	// 			affix: CustomTypes.Number({default: 1}),
	// 			itemLevel: CustomTypes.Number({default: 1}),
	// 			variance: CustomTypes.Number({default: 1}),
	// 		},
	// 	}
	// }
}