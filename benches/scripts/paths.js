const path = require('path');
const globby = require('globby');

const allBenches = '**/*.html';
const benchesRoot = (...args) => path.join(__dirname, '..', ...args);
const toUrl = str => str.replace(/^[A-Za-z]+:/, '/').replace(/\\/g, '/');

function globSrc(patterns) {
	return globby(patterns, { cwd: benchesRoot('src') });
}

module.exports = {
	allBenches,
	benchesRoot,
	toUrl,
	globSrc
};
