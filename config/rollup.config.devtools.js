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
			presets: [ ['es2015', { loose: true, modules: false }] ]
		})
	]
};
