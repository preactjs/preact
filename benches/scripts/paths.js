const path = require('path');
const globby = require('globby');

const repoRoot = (...args) => path.join(__dirname, '..', '..', ...args);
const benchesRoot = (...args) => repoRoot('benches', ...args);
const resultsPath = (...args) => benchesRoot('results', ...args);

const toUrl = str => str.replace(/^[A-Za-z]+:/, '/').replace(/\\/g, '/');

const allBenches = '**/*.html';
function globSrc(patterns) {
	return globby(patterns, { cwd: benchesRoot('src') });
}

module.exports = {
	repoRoot,
	benchesRoot,
	resultsPath,
	toUrl,
	allBenches,
	globSrc
};
