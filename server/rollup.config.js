import fs from 'fs';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import memory from 'rollup-plugin-memory';
import babel from 'rollup-plugin-babel';

let babelRc = JSON.parse(fs.readFileSync('./.babelrc'));
babelRc.presets[0][1].modules = false;

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
			presets: babelRc.presets,
			plugins: babelRc.plugins
		})
	]
};
