/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');
const moment = require('moment');
const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;
const TEST = chaiG.makeFailAndOK('message');

describe('=REST= Messages', () => {
	if(chaiG.filterLevel < 2) return;

	TEST.SET_USER(() => testUsers.chamberlainpi);

	TEST.FAIL('put::/list', 'Get messages');

	TEST.OK('get::/list', 'Get messages (none)', null, data => {
		assert.exists(data.messages, 'Messages field exists.');
		assert.equal(data.messages.length, 0, 'Messages.length == 0, none at this time.');
	});

	function checkMessageOK(game) {
		assert.exists(game, 'game field exists.');
		assert.equal(game.type, 'Generic Message', 'type is correct.');
		assert.equal(game.imageURL, 'JOB_IMAGE_URL', 'imageURL is correct.');
		assert.equal(game.title, 'JOB_TITLE', 'title is correct.');
		assert.equal(game.message, 'JOB_MESSAGE', 'message is correct.');
	}

	TEST.OK('post::/add', 'Add a message', {body: {
		game: {
			jobName: 'JOB_NAME',
			jobID: 'JOB_ID',
			title: 'JOB_TITLE',
			message: 'JOB_MESSAGE',
			imageURL: 'JOB_IMAGE_URL',
			dateExpires: moment().add(1, 'day'),
			type: 'Generic Message',
			isPublished: true,
			isForEveryone: true
		},
	}}, data => {
		checkMessageOK(data.game);
	});

	TEST.OK('get::/list', 'Get messages (1 exists)', null, data => {
		assert.exists(data.messages, 'Messages field exists.');
		assert.equal(data.messages.length, 1, 'Messages.length == 1, one exists.');

		checkMessageOK(data.messages[0].game);
	});

	TEST.OK('get::/inbox', 'Get messages relevant to user.', null, data => {
		assert.exists(data.messages, 'Messages field exists.');
		assert.equal(data.messages.length, 1, 'Messages.length == 1, one exists.');

		checkMessageOK(data.messages[0].game);
	});

});