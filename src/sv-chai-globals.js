/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = module.exports = {
	chai: require('chai'),
	chaiHTTP: require('chai-http'),
	request: require('request-promise'),
	mongoose: require('mongoose'),
	__api: "http://localhost:9000/api",
	TestUsers: {},

	sendAPI(urlEnd, method, options) {
		if(!_.isString(method) && arguments.length<3) {
			options = method;
			method = 'get';
		}

		if(!options) options = {};
		options.json = true;
		options.headers = {
			'Authorization': 'sf-dev'.toBase64()
		};

		return chaiG.request[method](chaiG.__api + urlEnd, options);
	},

	catcher(done) {
		return (err) => {
			chaiG.chai.assert.ifError(err);
			done();
		}
	}
};

//Indicate to use the REST-helper methods:
chaiG.chai.use(chaiG.chaiHTTP);