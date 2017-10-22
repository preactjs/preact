import fs from 'fs';
import buble from 'rollup-plugin-buble';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-post-replace';

let pkg = JSON.parse(fs.readFileSync('./package.json'));

let format = process.env.FORMAT;

export default {
	strict: false,
	sourcemap: true,
	exports: 'default',
	input: pkg.source,
	output: {
		format,
		name: pkg.amdName,
		file: format==='es' ? pkg.module : format==='umd' ? pkg['umd:main'] : pkg.main
	},
	plugins: [
		buble(),
		format==='cjs' && replace({
			'module.exports = index;': '',
			'var index =': 'module.exports ='
		}),
		format==='umd' && replace({
			'return index;': '',
			'var index =': 'return'
		}),
		format!=='es' && uglify({
			output: { comments: false },
			mangle: {
				toplevel: format==='cjs'
			}
		})
	]
};
