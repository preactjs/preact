import fs from 'fs';
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import memory from 'rollup-plugin-memory';

const pkg = JSON.parse(fs.readFileSync('./package.json'));

export default {
	entry: 'src/preact',
	sourceMap: true,
	exports: 'named',
	useStrict: false,
	plugins: [
		memory({
			path: 'src/preact',
			contents: "export * from './preact';"
		}),
		nodeResolve({
			main: true
		}),
		babel({
			sourceMap: true,
			loose: 'all',
			blacklist: ['es6.tailCall'],
			exclude: 'node_modules/**'
		})
	],
	targets: [
		{ dest: pkg['dev:main'], format: 'umd', moduleName: pkg.amdName },
		{ dest: pkg.module, format: 'es' }
	]
};
