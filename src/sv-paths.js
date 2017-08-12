/**
 * Created by Chamberlain on 8/10/2017.
 */
const path = require('path');
const __fullSplit = __dirname.__.split('/');
const paths = {};

trace("ROOT DIR: " + __dirname.__.yellow);

paths.__filename = __fullSplit.last();
paths.__dir = __fullSplit.slice(0, __fullSplit.length-1).join('/');
paths.__full = __fullSplit.join('/');
paths.__src = paths.__dir + '/src';
paths.__private = paths.__dir + '/.private';
paths.__data = paths.__dir + '/.private/data';
paths.__public = paths.__dir + '/public';
paths.__routes = paths.__dir + '/src/routes';
paths.__vue = paths.__dir + '/vue-test';
paths.__vueDist = paths.__dir + '/vue-test/dist';
paths.__vueIndex = paths.__dir + '/vue-test/index.html';
paths.__mongoSchemas = paths.__dir + '/src/mongo-schemas';

module.exports = paths;