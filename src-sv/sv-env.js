const dotenv = require('dotenv').config({path: '../.private/env.ini'});
const fs = require('fs-extra');

const _env = process.env.NODE_ENV || 'dev';
function main() {
	return _env;
}

main.port = process.env.PORT || 9000;

module.exports = main;
