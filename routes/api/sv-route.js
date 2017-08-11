/**
 * Created by Chamberlain on 8/10/2017.
 */

const auth = require('./sv-auth');

module.exports = function(route) {

	route.use('/*', (req, res, next) => {
		res.header('content-type','text/plain');
		res.header('Access-Control-Allow-Origin','*');

		next();
	});

	route.get('/test', (req, res) => {
		res.send("Test OK.");
	});

	route.get('/test-banned', (req, res) => {
		auth.ERRORS.BANNED(res);
	});

	route.use('/*', (req, res, next) => {
		if(!auth.isAuthorized(req, res)) return;

		next();
	});

	route.get('/users', (req, res) => {
		res.send("Users...");
	});
}