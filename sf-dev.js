require('./src/sv-globals');

const setupRoutes = require('./src/sv-setup-routes');
const setupMongo = require('./src/sv-setup-mongo-db');
const setupNodeMailer = require('./src/sv-setup-nodemailer');
const JSONLoader = require('./src/sv-setup-json-loader');
const jsonConfig = { url: $$$.env.ini.JSON_URL, app: $$$.app, isParseGlobals: true };

$$$.jsonLoader = new JSONLoader();

//Run these first promises in parallel, and then...
Promise.all([setupRoutes(), setupMongo(), setupNodeMailer(), $$$.jsonLoader.config(jsonConfig)])
	//.then(() => trace($$$.jsonLoader.globals))
	.then(setupMongo.createMongoModels) //Creates the models (see model-XXX.js under /src/models/)
	.then(setupRoutes.setTopLevelRoutes) //Creates the top-level / ending routes if nothing else routes them.
	.then(() => {
		// Finally once every promises passes, output some confirmation messages to the console
		trace([
				`Started SF-DEV on port ${$$$.env.ini.PORT} in environment`.cyan,
				`[${$$$.env().toUpperCase()}]`.magenta
			].join(' ')
		);

		//trace($$$.jsonLoader.globals);

		//Oh, before we go, check if we should be running the Test Suites (CHAI)...
		const isTesting = _.isTruthy($$$.env.ini.TEST);

		if(!isTesting) return;

		//If our TEST flag is enabled, then continue with the CHAI test suite:
		require('./src/sv-setup-chai-tests')();
	})
	.catch( err => {
		//If any errors occur in the previous steps... show the error in the console!!!
		traceError("========= OH NO! ==========");
		traceError(err);
	});