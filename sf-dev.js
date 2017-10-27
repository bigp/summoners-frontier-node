const cluster = require('cluster');
var args = [].slice.call(process.argv, 2);

if(args[0]==='cluster' && cluster.isMaster) {
	var persistent;

	function loopCluster() {
		if(!persistent) {
			console.log(`Master (${process.pid}) started the child process...`);
			persistent = cluster.fork();
		}

		setTimeout(loopCluster, 250);
	}

	loopCluster();

	cluster.on('exit', (worker, code, signal) => {
		console.log(`Worker ${worker.process.pid} died.`);
		persistent = null;
	});
} else {
	require('./main');
}