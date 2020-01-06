/* eslint-disable */
var renderToString;
try {
	renderToString = dep(require('preact-render-to-string'));
} catch (e) {
	throw Error(
		'renderToString() error: missing "preact-render-to-string" dependency.'
	);
}

function dep(obj) {
	return obj['default'] || obj;
}

module.exports = {
	renderToString: renderToString,
	renderToStaticMarkup: renderToString
};
