const path = require('path');
const globby = require('globby');

const benchesRoot = (...args) => path.join(__dirname, '..', ...args);
const resultsPath = (...args) => benchesRoot('results', ...args);

const toUrl = str => str.replace(/^[A-Za-z]+:/, '/').replace(/\\/g, '/');

const allBenches = '**/*.html';
function globSrc(patterns) {
	return globby(patterns, { cwd: benchesRoot('src') });
}

module.exports = {
	benchesRoot,
	resultsPath,
	toUrl,
	allBenches,
	globSrc
};
