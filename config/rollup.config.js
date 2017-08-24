import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import memory from 'rollup-plugin-memory';

export default {
	strict: true,
	input: 'src/preact.js',
	output: {
		format: 'iife',
		file: 'dist/preact.dev.js',
		name: 'preact',
		sourcemap: true
	},
	plugins: [
		memory({
			path: 'src/preact.js',
			contents: `
				import preact from './preact';
				if (typeof module!='undefined') module.exports = preact;
				else self.preact = preact;
			`
		}),
		nodeResolve({
			main: true
		}),
		babel({
			sourceMap: true,
			exclude: 'node_modules/**',
			babelrc: false,
			presets: [
				['env', {
					modules: false,
					loose: true,
					exclude: ['transform-es2015-typeof-symbol'],
					targets: {
						browsers: ['last 2 versions', 'IE >= 9']
					}
				}]
			]
		})
	]
};
