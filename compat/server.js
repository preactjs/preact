/* eslint-disable */
var renderToString
try {
	renderToString = dep(require('preact-render-to-string'));
} catch (e) {
	throw new Error(
		'You seem to be missing the "preact-render-to-string" dependency.\n' +
		'You can add this by using "npm install --save preact-render-to-string@next".'
	)
}

function dep(obj) { return obj['default'] || obj; }

module.exports = {
	renderToString: renderToString,
	renderToStaticMarkup: renderToString
};
