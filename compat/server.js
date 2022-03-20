const { renderToString } = require('preact/server');

module.exports = {
	renderToString,
	renderToStaticMarkup: renderToString
};
