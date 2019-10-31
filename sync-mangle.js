const { resolve } = require('path');
const { readFileSync, writeFileSync } = require('fs');

function readAsJSON(relativePath) {
	return JSON.parse(readFileSync(resolve(__dirname, relativePath), 'utf-8'));
}

function writeAsJSON(relativePath, body) {
	return writeFileSync(
		resolve(__dirname, relativePath),
		JSON.stringify(body, null, 2)
	);
}

// Get the root file
const root = readAsJSON(resolve(__dirname, 'mangle.json'));

// List the other mangles
const children = [
	'./compat/mangle.json',
	'./debug/mangle.json',
	'./hooks/mangle.json'
];

// Go through each file
children.forEach(childPath => {
	const result = readAsJSON(childPath);
	let needsUpdate = false;

	for (let prop in root.props.props) {
		if (prop in result.props.props) {
			if (result.props.props[prop] !== root.props.props[prop]) {
				needsUpdate = true;
				result.props.props[prop] = root.props.props[prop];
			}
		}
	}

	if (needsUpdate) {
		console.log(`Syncing ${childPath}`);
		writeAsJSON(childPath, result);
	}
});
