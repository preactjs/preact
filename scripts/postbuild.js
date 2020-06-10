const path = require('path');
const { copyFile } = require('fs/promises');

const subRepositories = ['compat', 'debug', 'devtools', 'hooks', 'test-utils'];

const repoRoot = (...args) => path.join(__dirname, '..', ...args);
const snakeCaseToCamelCase = str =>
	str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', ''));

const targets = [
	// Copy .module.js --> .mjs for Node 13 compat for main package
	{ from: 'dist/preact.module.js', to: 'dist/preact.mjs' },
	// Copy over preact.cjs --> preact.min.js for Preact 8 compat.
	{ from: 'dist/preact.js', to: 'dist/preact.min.js' },

	// Copy .module.js --> .mjs for Node 13 compat for sub-pacages
	...subRepositories.map(name => {
		const filename = name.includes('-') ? snakeCaseToCamelCase(name) : name;
		return {
			from: `${name}/dist/${filename}.module.js`,
			to: `${name}/dist/${filename}.mjs`
		};
	})
];

async function main() {
	await Promise.all(
		targets.map(({ from, to }) => {
			return copyFile(repoRoot(from), repoRoot(to));
		})
	);
}

main();
