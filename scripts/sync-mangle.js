const { resolve } = require('path');
const { readFileSync, copyFileSync } = require('fs');

// List the other mangles
const children = [
	'./compat/mangle.json',
	'./debug/mangle.json',
	'./hooks/mangle.json'
];

// Go through each file
children.forEach(childPath => {
	copyFileSync(
		resolve(__dirname, '..', 'mangle.json'),
		resolve(__dirname, '..', childPath)
	);
});
