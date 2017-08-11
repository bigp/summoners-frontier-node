/**
 * Created by Chamberlain on 8/10/2017.
 */
global._ = require('lodash');
require('colors');
require('../public/js/extensions');

//$$$.env('dev')
traceClear();

const fs = require('fs-extra');
const express = require('express');
const app = express();

global.wait = function(cb) {
	process.nextTick(cb);
};

global.waitTrace = function() {
	var args = arguments;
	wait(() => {
		_.each(args, (str, i) => {
			trace(str);
		})

	});
};

const paths = require('./sv-paths');
const events = require('events');

_.extend( events.prototype, {
	has(eventName) {
		return this.listenerCount(eventName)>0;
	}
});

const $$$ = global.$$$ = new events();

_.extend($$$, {
	env: require('./sv-env')(paths),
	express: express,
	app: app,
	server: require('http').createServer(app),
	paths: paths,
	now() {
		return new Date().toString();
	},

	sendPlainText(res, text) {
		res.send(text);
	},

	files: {
		readDir(dir, cb) {
			dir = dir.__;

			fs.pathExists(dir)
				.then(ok => {
					if(!ok) return cb("Not found: " + dir);

					return fs.readdir(dir);
				})
				.then(files => {
					files = files
						.filter(file => !(file==='.' || file==='..'))
						.map(file => (dir+ '/' + file).__);

					cb(null, files);
				})
				.catch(cb);

		},

		filter(dir, listFilters, cb) {
			if(!_.isArray(listFilters)) listFilters = [listFilters];

			//Correct the filters if they are strings / regexp types:
			listFilters = listFilters
				.map( filter => {
					if(_.isString(filter)) {
						//Assume it's a file-extension matcher:
						return f => f.has(filter);
					} else if(_.isRegExp(filter)) {
						return f => filter.test(f);
					}

					return filter;
				})
				.filter( filter => _.isFunction(filter) );

			var totalDone = 0;
			const results = [];
			const promises = [];

			// Determine promises ahead of time:
			listFilters.forEach( (filter, f) => _.isPromise(filter()) && promises.push(f));


			// Read the dir:
			this.readDir(dir, (err, files) => {
				if(err) return cb(err);

				totalDone = files.length;

				//Iterate each files / paths and apply the async/sync filters:
				files.forEach((file, f) => _nextFilter(file, f, 0));
			});


			// Recursive filter iterator:
			function _nextFilter(file, f, ff, data) {
				//If we made it through ALL filters (FINISH LINE!) then add this file to the results:
				if(ff >= listFilters.length) {
					results.push(file);
					return _done();
				}

				if(!data) data = file;

				const filter = listFilters[ff];

				//If this filter ID is a promise, call it as a promise:
				if(promises.has(ff)) {
					filter(file)
						.then( result => _nextFilter(file, f, ff + 1, result))
						.catch(err => _done() );
				} else {
					if(filter(data)) {
						return _nextFilter(file, f, ff + 1);
					}
					_done();
				}
			}


			//Counter:
			function _done() {
				if((--totalDone)<=0) {
					var justNames = results.map(f => f.split('/').pop());
					cb(null, results, justNames);
				}
			}
		},

		dirs(dir, cb) {
			this.filter(dir, [ fs.stat, stat => stat && stat.isDirectory() ], cb);
		}
	}
});