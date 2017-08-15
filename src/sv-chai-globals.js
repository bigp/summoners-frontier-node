/**
 * Created by Chamberlain on 8/14/2017.
 */
global.chai = require('chai');
global.assert = chai.assert;
global.chaiHTTP = require('chai-http');

//Indicate to use the REST-helper methods:
chai.use(chaiHTTP);
