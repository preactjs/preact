module.exports = () => {};

if (process.env.NODE_ENV === 'development') {
	module.exports = require('./debug.js').setConfig;
	require('../devtools');
}