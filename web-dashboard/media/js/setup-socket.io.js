var trace = window.trace.makeLogger('SOCKET-IO', '#f4a');

function reload(data) {
	if(data) {
		if(data.has('.less')) return;
		if(data.has('.css')) return reloadStylesheets();
	}

	setTimeout(() => {
		trace("Reloading page...");
		window.location.reload(true);
	}, 400);
}

function reloadStylesheets() {
	var queryString = '?reload=' + new Date().getTime();
	$('link[rel="stylesheet"][hot-reload]').each(function () {
		this.href = this.href.replace(/\?.*|$/, queryString);
	});
}

trace("Initialize");

$$$.io = io('/web-dashboard');

$$$.io.on('reload', reload);
$$$.io.on('disconnect', function() {
	trace("Reconnecting...");
	$$$.io.once('connect', reload);
});