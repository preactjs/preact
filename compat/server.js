const { renderToString } = require('preact/server');

module.exports = {
	renderToString: renderToString,
	renderToStaticMarkup: renderToString
};
