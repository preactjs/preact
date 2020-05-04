const fs = require('fs');

const snakeCaseToCamelCase = str =>
	str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', ''));

const copy = name => {
	// Copy .module.js --> .mjs for Node 13 compat.
	const filename = name.includes('-') ? snakeCaseToCamelCase(name) : name;
	fs.writeFileSync(
		`${process.cwd()}/dist/${filename}.mjs`,
		fs.readFileSync(`${process.cwd()}/dist/${filename}.module.js`)
	);
};

copy('index');
copy('jsx');
