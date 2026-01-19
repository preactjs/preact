import path from 'node:path';
import fs from 'node:fs';
import * as kl from 'kolorist';

import pkg from '../package.json' with { type: 'json' };

const pkgFiles = new Set(pkg.files);
const compatDir = path.resolve('compat');
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
