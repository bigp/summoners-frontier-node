require('./src/sv-globals');

const routeSetup = require('./src/sv-setup-routes');
const mongoSetup = require('./src/sv-setup-mongo-db');

$$$.on('routes-ready', mongoSetup);
$$$.on('mongo-ready', routeSetup.setTopLevelRoutes);
$$$.on('ready', () => {
	trace([
			`Started SF-DEV on port ${$$$.env.PORT}`.cyan,
			`(**${routeSetup.numRoutes()}** routes)`.yellow,
			`in environment`.cyan,
			`[${$$$.env().toUpperCase()}]`
		].join(' ')
	);

	if(_.isTruthy($$$.env.TEST)) {
		const chaiTests = require('./src/sv-setup-chai-tests');
	}
});