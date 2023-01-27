const { renderToString } = require('preact-render-to-string');

module.exports = {
	renderToString,
	renderToStaticMarkup: renderToString
};
