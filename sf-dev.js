const trace = console.log.bind(console);
const cluster = require('cluster');
var args = [].slice.call(process.argv, 2);

switch(args[0]) {
	case 'cluster': {
		if(!cluster.isMaster) break;

		var persistent;

		function loopCluster() {
			if(!persistent) {
				trace(`Master (${process.pid}) started the child process...`);
				persistent = cluster.fork();
			}

			setTimeout(loopCluster, 250);
		}

		loopCluster();

		cluster.on('exit', (worker, code, signal) => {
			trace(`Worker ${worker.process.pid} died.`);
			persistent = null;
		});

		return;
	}

	case 'test': {
		require('./test');
		return;
	}

	default: break;
}

require('./main');

