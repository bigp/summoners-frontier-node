/**
 * Created by Chamberlain on 8/14/2017.
 */

// const derpy = $$$.encodeToken('sf-admin', new Date().toLocaleDateString());
// trace(derpy);
// const derp = ['sf-admin', new Date().toLocaleDateString()];
// trace(derp);
// trace(derp.join('::'));
// trace(derp.join('::').toBase64());
// trace($$$.decodeToken(derpy));


const chaiG = module.exports = {
	chai: require('chai'),
	chaiHTTP: require('chai-http'),
	request: require('request-promise'),
	mongoose: require('mongoose'),
	__api: `${process.env.HTTP_TYPE}://localhost:${$$$.env.ini.PORT}/api`,
	TestUsers: {},

	sendAPI(urlEnd, method, options) {
		if(!_.isString(method) && arguments.length<3) {
			options = method;
			method = 'get';
		}

		if(!options) options = {};
		options.json = true;
		if(!options.headers) {
			options.headers = {
				'Authorization': $$$.encodeToken('sf-admin', new Date().toLocaleDateString())
			};
		}

		return chaiG.request[method](chaiG.__api + urlEnd, options)
			.then(data => {
				if(data && data.data) {
					return data.data;
				}
				return data;
			});
	},

	catcher(done) {
		return (err) => {
			chaiG.chai.assert.ifError(err);
			done();
		}
	},

	padError(err) {
		trace("      " + err);
	}
};

//Indicate to use the REST-helper methods:
chaiG.chai.use(chaiG.chaiHTTP);