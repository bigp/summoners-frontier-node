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
		res.status(503);
		cb(res);
	}
});

function checkAuthentication(req) {
	traceProps(req.headers);
}

module.exports = {
	ERRORS: ERRORS,

	isAuthorized(req, res) {
		if(!checkAuthentication(req)) return ERRORS.NOT_AUTHORIZED(res);

		return true;
	}
};