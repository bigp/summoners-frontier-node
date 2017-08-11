/**
 * Created by Chamberlain on 8/10/2017.
 */

const ERRORS = _.mapValues({
	NOT_AUTHORIZED(res) {
		res.send("Not Authorized!");
	},
	BANNED(res) {
		res.send("Banned User!");
	}
}, function mapErrorStatus(cb) {
	return (res) => {
		res.status(401);
		cb(res);
	}
});

function isAuthorized(req) {
	const authCode64 = req.headers.authorization;
	if(!authCode64 || authCode64.trim().length===0) return false;

	//Check if the player is authorized...
	const authCode = authCode64.fromBase64();
	trace(authCode64 + " : " + authCode);
	return true;
}

module.exports = {
	ERRORS: ERRORS,

	isAuthMiddleware(req, res, next) {
		if(!isAuthorized(req)) return ERRORS.NOT_AUTHORIZED(res);

		next();
	},

	configHeaders(res) {
		res.header('Access-Control-Allow-Origin','*');
		res.header('Access-Control-Allow-Credentials','true');
		res.header('content-type','text/plain');
	}
};