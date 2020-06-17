const fs = require('fs');

const subRepositories = ['compat', 'debug', 'devtools', 'hooks', 'test-utils'];
const snakeCaseToCamelCase = str =>
	str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', ''));

const copyPreact = () => {
	// Copy .module.js --> .mjs for Node 13 compat.
	fs.writeFileSync(
		`${process.cwd()}/dist/preact.mjs`,
		fs.readFileSync(`${process.cwd()}/dist/preact.module.js`)
	);
};

const copy = name => {
	// Copy .module.js --> .mjs for Node 13 compat.
	const filename = name.includes('-') ? snakeCaseToCamelCase(name) : name;
	fs.writeFileSync(
		`${process.cwd()}/${name}/dist/${filename}.mjs`,
		fs.readFileSync(`${process.cwd()}/${name}/dist/${filename}.module.js`)
	);
};

copyPreact();
subRepositories.forEach(copy);
