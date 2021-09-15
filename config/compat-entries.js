const path = require('path');
const fs = require('fs');
const kl = require('kolorist');

const pkgFiles = new Set(require('../package.json').files);
const compatDir = path.join(__dirname, '..', 'compat');
const files = fs.readdirSync(compatDir);

let missing = 0;
for (const file of files) {
	const expected = 'compat/' + file;
	if (/\.(js|mjs)$/.test(file) && !pkgFiles.has(expected)) {
		missing++;

		const filePath = kl.cyan('compat/' + file);
		const label = kl.inverse(kl.red(' ERROR '));
		console.error(
			`${label} File ${filePath} is missing in "files" entry in package.json`
		);
	}
}

if (missing > 0) {
	process.exit(1);
}
