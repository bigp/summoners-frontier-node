/**
 * Created by Chamberlain on 8/10/2017.
 */


const ERRORS = _.mapValues({
	NOT_AUTHORIZED() {
		return "Not Authorized!";
	},
	INCORRECT_AUTHCODE() {
		return "Incorrect Authorization!";
	},
	BANNED() {
		return "Banned User!";
	},
	REQUEST_LIMIT(res) {
		return $$$.send.error(res,"Reached API-Request limit, please wait a while for your next request: " + res.req.ip);
	}
}, cbError => (res) => {
	res.status(401);
	if(cbError.length===1) return cbError(res);

	$$$.send.error(res, cbError());
});

function isAuthorized(req) {
	const authCode64 = req.headers.authorization;
	if(!authCode64 || authCode64.trim().length===0) return ERRORS.NOT_AUTHORIZED;

	//Check if the player is authorized...
	const authCodeStr = authCode64.fromBase64();
	const authSplit = authCodeStr.split("::");
	const authCode = authSplit[0];
	const authDate = new Date().toLocaleDateString();

	req.authCodes = authSplit;

	if(authCode===$$$.env.AUTH_ADMIN && authSplit[1]===authDate) {
		req.isAuth = true;
		req.isAdmin = true;
		return true;
	}

	if(authCode!==$$$.env.AUTH_CODE) {
		return ERRORS.INCORRECT_AUTHCODE;
	}

	req.isAuth = true;

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
		res.header('content-type','application/json'); //text/plain
	}
};