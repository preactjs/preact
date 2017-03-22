if (typeof process === 'undefined' || process.env && process.env.NODE_ENV !== 'production') {
	const initDevTools = require('./devtools').initDevTools;
	initDevTools();
}
