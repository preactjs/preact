import fs from 'fs';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import memory from 'rollup-plugin-memory';
import babel from 'rollup-plugin-babel';

let babelRc = JSON.parse(fs.readFileSync('./.babelrc'));

let entry = process.env.ENTRY || 'index';

export default {
	entry: 'src/'+entry+'.js',
	exports: 'default',
	useStrict: false,
	external: ['preact'],
	plugins: [
		memory({
			path: 'src/'+entry+'.js',
			contents: "export { default } from './"+entry+"';"
		}),
		nodeResolve({
			skip: ['preact'],
			main: true
		}),
		commonjs(),
		babel({
			babelrc: false,
			comments: false,
			exclude: [],
			presets: ['es2015-minimal-rollup'].concat(babelRc.presets.slice(1)),
			plugins: babelRc.plugins
		})
	]
};
