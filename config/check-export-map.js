/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(
	fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

console.log('Checking export maps...');
for (const pkgName in pkg.exports) {
	const entry = pkg.exports[pkgName];

	if (typeof entry === 'string') {
		if (!fs.existsSync(path.join(__dirname, '..', entry))) {
			throw new Error(
				`Could not find export map file for "${pkgName}" ${entry}`
			);
		}
	} else {
		for (const type in entry) {
			if (pkgName === './') continue;

			const fileName = entry[type];
			if (!fs.existsSync(path.join(__dirname, '..', fileName))) {
				throw new Error(
					`Could not find export map file for "${pkgName}" ${type}: ${fileName}`
				);
			}
		}
	}
}

console.log('Checking export maps... DONE');
