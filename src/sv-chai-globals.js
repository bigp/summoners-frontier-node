/**
 * Created by Chamberlain on 8/14/2017.
 */
const chai = require('chai');
const assert = chai.assert;

const chaiG = module.exports = {
	chai: chai,
	chaiHTTP: require('chai-http'),
	request: require('request-promise'),
	mongoose: require('mongoose'),
	testUsers: {},

	showTraces: _.isTruthy($$$.env.ini.MOCHA.SHOW_TRACES),
	filterLevel: $$$.env.ini.MOCHA.FILTER_LEVEL | 0,

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

		chaiG.testUsers.jon = new User({
			name: 'Jon',
			username: 'Jon123',
			email: 'jon@gmail.com',
			_password: $$$.md5('pi3rr3'),
		});
	},

	randomItemSeeds(quality, affix, itemLevel, variance) {
		return {quality: quality, affix: affix, itemLevel: itemLevel, variance: variance};
	},

	makeFailAndOK(prefix) {
		var testMethods = {
			testUser: null,

			SET_USER: (method) => {
				it('/.../ SETTING USER...', () => {
					testMethods.testUser = method();
				});
			},

			OK(url, header, body, onData) {
				var method = "get";

				if(url.has('::')) {
					var urlSplit = url.split('::');
					method = urlSplit[0];
					url = urlSplit[1];
				}

				it(`/${prefix}${url} ... ${header}`, done => {
					if(_.isFunction(body)) body = body();
					testMethods.testUser.sendAuth('/' + prefix + url, method, body)
						.then(data => {
							assert.exists(data);
							onData(data);
							done();
						})
						.catch(err => done(err));
				});
			},

			FAIL(url, header, body) {
				var method = "get";
				if(url.has('::')) {
					var urlSplit = url.split('::');
					method = urlSplit[0];
					url = urlSplit[1];
				}

				it(('* '.red) + `/${prefix}${url} ... ${header}`, done => {
					if(_.isFunction(body)) body = body();
					testMethods.testUser.sendAuth('/' + prefix + url, method, body)
						.then(data => {
							done('Should not exists!');
						})
						.catch(err => {
							//trace('    ' + (err.message).yellow);
							assert.exists(err);
							done();
						});
				});
			}
		};

		return testMethods;
	}
};