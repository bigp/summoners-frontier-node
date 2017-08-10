const dotenv = require('dotenv').config({path: '.private/env.ini'});
const fs = require('fs-extra');

const ENV = process.env;
const NODE_ENV = ENV.NODE_ENV || 'dev';

function main() { return NODE_ENV; }
main.port = ENV.PORT || 9000;

module.exports = main;
