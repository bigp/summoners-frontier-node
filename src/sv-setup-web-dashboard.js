/**
 * Created by Chamberlain on 10/27/2017.
 */

const webdash = $$$.webdash = {};

function setupWebDashboard() {
	trace("WEB-DASHBOARD: ".yellow + "Init.");

	webdash.io = $$$.io.of('/web-dashboard');

	webdash.__public = $$$.paths.__dir + '/web-dashboard';

	webdash.route = $$$.express.Router();

	if($$$.isDev) {
		prepareHotReload();
	}

	webdash.route.use('/', $$$.express.static(webdash.__public));
	webdash.route.use('/public', $$$.express.static($$$.paths.__public));

	$$$.app.use('/web-dashboard', webdash.route);
}

function prepareHotReload() {
	const wp = require('webpack');
	const MemoryFS = require('memory-fs');
	const memFS = new MemoryFS();
	const wpConfig = require('../web-dashboard/webpack.config');
	const wpCompiler = wp(wpConfig);
	const path = require('path');

	wpCompiler.outputFileSystem = memFS;

	function wpRecompile(path) {
		wpCompiler.run(done => {
			webdash.io.emit('reload', path);
		});
	}

	$$$.addWatcher('web-dashboard/**', path => {
		if(path.has('bundle.js')) {
			return trace("Bundle updated.");
		}

		wpRecompile(path);
	});

	wpRecompile();

	webdash.route.use('/dist/*', (req, res, next) => {
		var filepath = webdash.__public + req.baseUrl.replace('web-dashboard/', '');

		if(!memFS.existsSync(filepath)) {
			res.status(404).send('Webpack resource not found in /dist');
		}

		var content = memFS.readFileSync(filepath, 'utf8');
		res.send(content);
	});
}

module.exports = setupWebDashboard;