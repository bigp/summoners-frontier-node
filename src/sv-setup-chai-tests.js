/**
 * Created by Chamberlain on 8/14/2017.
 */

const Mocha = require('mocha');
const path = require('path');
const mocha = new Mocha();

//Find and add all the tests JS files found in the /tests/ sub-folder:
$$$.files.forEachJS($$$.paths.__tests, f => mocha.addFile(f), runTests);

//Once tests are added, run the tests!
function runTests() {
	// Run the tests.
	mocha.run(function (failures) {
		process.on('exit', function () {
			process.exit(failures);  // exit with non-zero status if there were failures
		});
	});
}