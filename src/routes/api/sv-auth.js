/**
 * Created by Chamberlain on 8/10/2017.
 */

const ERRORS = _.mapValues({
	NOT_AUTHORIZED(res) {
		res.send("Not Authorized!");
	},
	INCORRECT_AUTHCODE(res) {
		res.send("Incorrect Authorization!");
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
	if(!authCode64 || authCode64.trim().length===0) return ERRORS.NOT_AUTHORIZED;

	//Check if the player is authorized...
	const authCode = authCode64.fromBase64();

	if(authCode!==$$$.env.AUTH_CODE) {
		return ERRORS.INCORRECT_AUTHCODE;
	}

	return true;
}

module.exports = {
	ERRORS: ERRORS,

	isAuthMiddleware(req, res, next) {
		var authOK = isAuthorized(req);
		if(authOK===true) return next();

		authOK(res);
	},

	configHeaders(res) {
		res.header('Access-Control-Allow-Origin','*');
		res.header('Access-Control-Allow-Credentials','true');
		res.header('content-type','text/plain');
	}
};