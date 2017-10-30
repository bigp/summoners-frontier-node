var trace = window.trace.makeLogger('SOCKET-IO', '#f4a');

import HotReload from './hot-reload';

trace("Initialize");

$$$.io = io('/web-dashboard');

$$$.io.on('reload', HotReload.reload);
$$$.io.on('disconnect', function() {
	trace("Reconnecting...");
	$$$.io.once('connect', HotReload.reload);
});