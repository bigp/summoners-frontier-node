/**
 * Created by Chamberlain on 8/10/2017.
 */

const auth = require('./sv-auth');
const cors = require('cors');

module.exports = function(route) {
	route.use(cors());

	PUBLIC_ROUTES();

	route.use('/*', auth.isAuthMiddleware);

	SECURE_ROUTES();

	////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////

	function PUBLIC_ROUTES() {
		route.use('/*', (req, res, next) => {
			//This sets cross-origin / verbs allowed to call:
			auth.configHeaders(res);
			next();
		});

		route.get('/test', (req, res) => {
			res.send("Test OK.");
		});

		route.get('/test-banned', (req, res) => {
			auth.ERRORS.BANNED(res);
		});

		route.use('/unsec-user', (req, res) => {
			res.send("<i class='purple'>Unsecure user operation...</i>");
		});
	}

	function SECURE_ROUTES() {
		route.get('/users', (req, res) => {
			res.send("Users (many)...");
		});

		route.get('/user', (req, res) => {
			res.send("User (single)...");
		});
	}
};