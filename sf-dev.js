require('./src/sv-globals');

const routeSetup = require('./src/sv-routes-setup');
const mongoSetup = require('./src/sv-mongo-setup');

mongoSetup();

$$$.on('ready', () => {
	trace(
		`Started SF-DEV on port ${$$$.env.PORT} 
		(${routeSetup.length} routes) 
		in environment`.noLines.cyan + ` [${$$$.env().toUpperCase()}]`
	);
});
