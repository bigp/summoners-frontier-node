/**
 * Created by Chamberlain on 8/10/2017.
 */

const session = require('express-session');
const bodyParser = require('body-parser');
const timeSecondMS = 1000;
const timeMinuteMS = 60 * timeSecondMS;
const timeHourMS = 60 * timeMinuteMS;
const timeDayMS = 24 * timeHourMS;

$$$.app.use(bodyParser.urlencoded({ extended: false }));
$$$.app.use(bodyParser.json());
$$$.app.set('trust proxy', 1);
// $$$.app.use( session({
// 	secret: $$$.env.SECRET || 'secret',
// 	resave: false,
// 	saveUninitialized: true,
// 	cookie: {maxAge: timeDayMS}
// }));

const routes = [];

$$$.files.dirs($$$.paths.__routes, (err, files, names) => {
	if(err) throw err;

	files.forEach( (fullpath, f) => {
		const __filename = names[f];
		const __route = '/'+__filename;
		const __routeModule = fullpath + '/sv-route.js';
		const routeModule = require(__routeModule);
		const route = $$$.express.Router();

		routeModule(route);

		route.get('/*', (req, res) => {
			$$$.sendPlainText(res, 'testing ' + __filename);
		});

		$$$.app.use(__route, route);

		routes.push(route);
	});

	applyTopRoute();
});

function applyTopRoute() {
	$$$.app.use("/", $$$.express.static($$$.paths.__public));
	$$$.app.use("/dist", $$$.express.static($$$.paths.__vueDist));

	$$$.server.listen($$$.env.PORT, function (err) {
		if (err) throw err;

		if(!$$$.has('ready')) {
			return trace("No 'ready' listeners set.".red);
		}

		$$$.emit('ready');
	});
}

module.exports = routes;