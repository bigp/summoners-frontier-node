/**
 * Created by Chamberlain on 8/10/2017.
 */
const path = require('path');
const __fullSplit = __dirname.__.split('/');
const paths = {};

trace(__dirname);

paths.__filename = __fullSplit.last();
paths.__dir = __fullSplit.slice(0, __fullSplit.length-1).join('/');
paths.__full = __fullSplit.join('/');
paths.__private = paths.__dir + '/.private';
paths.__data = paths.__private + '/data';
paths.__public = paths.__dir + '/public';
paths.__routes = paths.__dir + '/routes';
paths.__vue = paths.__dir + '/vue-test';
paths.__vueDist = paths.__vue + '/dist';

module.exports = paths;