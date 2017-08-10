const express = require('express');
const app = express();
const server = require('http').createServer(app);
const trace = console.log.bind(console);

function sendPlainText(res, text) {
	res.header('content-type','text/plain');
	res.send(text);
}

app.use("/", (req, res, next) => {
	sendPlainText(res, "<b>Hello World</b>");
});


server.listen('9000', function (err) {
	if(err) throw err;
	trace("Started SF-DEV on '9000'");
});