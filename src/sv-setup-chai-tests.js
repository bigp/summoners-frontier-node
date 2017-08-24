/**
 * Created by Chamberlain on 8/14/2017.
 */

const Mocha = require('mocha');
const path = require('path');
const CONFIG = $$$.env.ini.MOCHA || {};
const regexTestFiles = new RegExp(CONFIG.TEST_FILE_PATTERN || '.*', 'gi');
const mocha = new Mocha();

function addTest(file, name) {
	if(!regexTestFiles.test(name)) return;
	mocha.addFile(file);
}

//Find and add all the tests JS files found in the /tests/ sub-folder:
$$$.files.forEachJS($$$.paths.__tests, addTest, runTests);

//Once tests are added, run the tests!
function runTests() {
	// Run the tests.
	trace(" ................ Running Tests");
	mocha.run(function (failures) {
		process.on('exit', function () {
			process.exit(failures);  // exit with non-zero status if there were failures
		});
	});
}