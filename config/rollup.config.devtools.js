import babel from 'rollup-plugin-babel';

export default {
	input: 'devtools/index.js',
	output: {
		format: 'umd',
		file: 'devtools.js',
		name: 'preactDevTools',
		sourcemap: true,
		globals: {
			preact: 'preact'
		}
	},
	external: ['preact'],
	plugins: [
		babel({
			sourceMap: true,
			exclude: 'node_modules/**',
			babelrc: false,
			presets: [
				['@babel/env', {
					modules: false,
					loose: true,
					exclude: ['transform-typeof-symbol'],
					targets: {
						browsers: ['last 2 versions', 'IE >= 9']
					}
				}]
			]
		})
	]
};
