require('./src/sv-globals');

const routes = require('./src/sv-routes-setup');

$$$.on('ready', () => {
	trace(
		`Started SF-DEV on port ${$$$.env.PORT} 
		(${routes.length} routes) 
		in environment`.noLines.cyan + ` [${$$$.env().toUpperCase()}]`
	);
});
