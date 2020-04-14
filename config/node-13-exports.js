const fs = require('fs');

const subRepositories = ['compat', 'debug', 'devtools', 'hooks', 'test-utils'];

const snakeCaseToCamelCase = str =>
	str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', ''));

const copyPreact = () => {
	fs.writeFileSync(
		`${process.cwd()}/dist/preact.mjs`,
		fs.readFileSync(`${process.cwd()}/dist/preact.module.js`)
	);
	fs.writeFileSync(
		`${process.cwd()}/dist/preact.mjs.map`,
		fs.readFileSync(`${process.cwd()}/dist/preact.module.js.map`)
	);
};

const copy = name => {
	const filename = name.includes('-') ? snakeCaseToCamelCase(name) : name;
	fs.writeFileSync(
		`${process.cwd()}/${name}/dist/${filename}.mjs`,
		fs.readFileSync(`${process.cwd()}/${name}/dist/${filename}.module.js`)
	);
	fs.writeFileSync(
		`${process.cwd()}/${name}/dist/${filename}.mjs.map`,
		fs.readFileSync(`${process.cwd()}/${name}/dist/${filename}.module.js.map`)
	);
};

copyPreact();
subRepositories.forEach(copy);
