require('./src/sv-globals');

const routeSetup = require('./src/sv-setup-routes');
const mongoSetup = require('./src/sv-setup-mongo-db');
const nodemailer = require('./src/sv-setup-nodemailer');

$$$.on('routes-ready', mongoSetup);
$$$.on('mongo-ready', routeSetup.setTopLevelRoutes);
$$$.on('ready', () => {
	trace([
			`Started SF-DEV on port ${$$$.env.ini.PORT}`.cyan,
			`(**${routeSetup.numRoutes()}** routes)`.yellow,
			`in environment`.cyan,
			`[${$$$.env().toUpperCase()}]`
		].join(' ')
	);

	//If our TEST flag is enabled, then continue with the CHAI test suite:
	if(_.isTruthy($$$.env.ini.TEST)) {
		const chaiTests = require('./src/sv-setup-chai-tests');
		chaiTests();
	}
});