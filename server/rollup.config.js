import fs from 'fs';
import memory from 'rollup-plugin-memory';
import babel from 'rollup-plugin-babel';

let babelRc = JSON.parse(fs.readFileSync('./.babelrc'));

export default {
	entry: 'src/index.js',
	exports: 'default',
	useStrict: false,
	external: ['preact'],
	plugins: [
		memory({
			path: 'src/index.js',
			contents: "export { default } from './index';"
		}),
		babel({
			babelrc: false,
			comments: false,
			exclude: 'node_modules/**',
			presets: ['es2015-minimal-rollup'].concat(babelRc.presets.slice(1)),
			plugins: babelRc.plugins
		})
	]
};
