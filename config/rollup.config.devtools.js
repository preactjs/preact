import babel from 'rollup-plugin-babel';

export default {
	entry: 'devtools/index.js',
	external: ['preact'],
	format: 'umd',
	globals: {
		preact: 'preact'
	},
	moduleName: 'preactDevTools',
	plugins: [
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
