/* eslint-disable */
var renderToString = dep(require('preact-render-to-string'));

function dep(obj) { return obj['default'] || obj; }

module.exports = {
	renderToString: renderToString,
	renderToStaticMarkup: renderToString
};
