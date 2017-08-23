/**
 * Created by Chamberlain on 8/22/2017.
 */

const activeRequests = [];

var CONFIG = {limit: 5, cap: 10, isLogged: true};
const MODULE = {
	isTooMuch(req) {
		const entry = activeRequests.find(r => r.ip === req.ip);

		if (!entry) {
			activeRequests.push({ip: req.ip, numRequests: 1, maxRequest: 1, isLimited: false});
			return false;
		}

		entry.numRequests = Math.min(CONFIG.cap, entry.numRequests + 1);

		if(entry.numRequests > entry.maxRequest) entry.maxRequest = entry.numRequests;
		
		if (entry.numRequests > CONFIG.limit) {
			entry.isLimited = true;
			return true;
		}

		return false;
	},

	loop() {
		for(var a=activeRequests.length; --a>=0;) {
			var entry = activeRequests[a];

			if((--entry.numRequests)>0) continue;

			if(CONFIG.isLogged && entry.isLimited) {
				trace("Released request count on IP: " + entry.ip + " : " + entry.maxRequest);
			}

			activeRequests.splice(a, 1);
		}
	}
};

module.exports = function(config) {
	if(!config) config = {};

	CONFIG = _.extend(CONFIG, config);

	return MODULE;
};

var loopID = setInterval(MODULE.loop, 1000);