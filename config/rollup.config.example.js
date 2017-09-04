import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
	strict: true,
	input: 'example/index.js',
	output: {
		format: 'iife',
		file: 'example_tmp/index.dev.js',
		name: 'example',
		sourcemap: true
	},
	plugins: [
		nodeResolve({
			main: true
		}),
		babel({
			sourceMap: true,
			exclude: 'node_modules/**',
			babelrc: false,
			plugins: [
        ["transform-react-jsx", { "pragma":"h" }]
			],
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
