if (NODE_ENV !== 'production') {
	const initDevTools = require('./devtools').initDevTools;
	initDevTools();
}
