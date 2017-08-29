require('./src/sv-globals');

const setupRoutes = require('./src/sv-setup-routes');
const setupMongo = require('./src/sv-setup-mongo-db');
const setupNodeMailer = require('./src/sv-setup-nodemailer');
const JSONLoader = require('./src/sv-setup-json-loader');

const jsonLoader = $$$.jsonLoader = new JSONLoader();
const jsonPromise = $$$.jsonLoader.config({
	url: $$$.env.ini.JSON_URL,
	app: $$$.app,
	isParseGlobals: true
});


Promise.all([jsonPromise, setupRoutes(), setupMongo()])
	.then(setupMongo.createMongoModels)
	.then(setupRoutes.setTopLevelRoutes)
	.then(() => {
		trace('== JSON Loaded =='.green);
		trace($$$.jsonLoader.globals);
		trace([
				`Started SF-DEV on port ${$$$.env.ini.PORT}`.cyan,
				`(**${setupRoutes.numRoutes()}** routes)`.yellow,
				`in environment`.cyan,
				`[${$$$.env().toUpperCase()}]`
			].join(' ')
		);

		return _.isTruthy($$$.env.ini.TEST);
	})
	.then( isTesting => {
		if(!isTesting) return;

		//If our TEST flag is enabled, then continue with the CHAI test suite:
		require('./src/sv-setup-chai-tests')();
	})
	.catch( err => {
		traceError("========= OH NO! ==========");
		traceError(err);
	});