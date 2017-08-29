/**
 * Created by Chamberlain on 8/14/2017.
 */

const chaiG = module.exports = {
	chai: require('chai'),
	chaiHTTP: require('chai-http'),
	request: require('request-promise'),
	mongoose: require('mongoose'),
	testUsers: {},

	showTraces: _.isTruthy($$$.env.ini.MOCHA.SHOW_TRACES),

	catcher(done) {
		return (err) => {
			chaiG.chai.assert.ifError(err);
			done();
		}
	},

	padError(err) {
		if(!chaiG.showTraces) return;
		trace("      " + err);
	},

	makeTestUsers() {
		const User = $$$.models.User;

		chaiG.testUsers.chamberlainpi = new User({
			name: 'Pierre Chamberlain',
			username: 'chamberlainpi',
			email: 'chamberlainpi@gmail.com',
			_password: $$$.md5('pi3rr3')
		});
	},

	sendAPIAuth(path, method, options) {
		if(!options) options = {};

		options.headers = {'Authorization': chaiG.userAuth};

		return $$$.send.api(path, method, options);
	}
};

//Indicate to use the REST-helper methods:
chaiG.chai.use(chaiG.chaiHTTP);