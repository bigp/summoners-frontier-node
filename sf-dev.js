const env = require('./src-sv/sv-env');
const colors = require('colors');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const trace = console.log.bind(console);

function now() {
	return new Date().toString();
}
function sendPlainText(res, text) {
	trace("Hello World! " + (now().red));

	res.header('content-type','text/plain');
	res.send(text);
}

app.use("/", (req, res, next) => {
	sendPlainText(res, "<b>Hello World</b> " + now());
});

server.listen('9000', function (err) {
	if(err) throw err;

	trace(`Started SF-DEV on '9000' in environment: ${env()}`);
});