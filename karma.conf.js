/*eslint-env node */
/*eslint no-var:0, object-shorthand:0 */

var coverage = String(process.env.COVERAGE)!=='false',
	webpack = require('webpack');

module.exports = function(config) {
	config.set({
		frameworks: ['mocha', 'chai-sinon'],

		reporters: ['mocha'].concat(coverage ? 'coverage' : []),

		coverageReporter: {
			reporters: [
				{
					type: 'text-summary'
				},
				{
					type: 'html',
					dir: 'coverage'
				}
			]
		},

		browsers: ['PhantomJS'],

		files: [
			'test/browser/**.js',
			'test/shared/**.js'
		],

		preprocessors: {
			'test/**/*.js': ['webpack'],
			'src/**/*.js': ['webpack'],
			'**/*.js': ['sourcemap']
		},

		webpack: {
			module: {
				/* Transpile source and test files */
				preLoaders: [
					{
						test: /\.jsx?$/,
						exclude: /node_modules/,
						loader: 'babel',
						query: {
							loose: 'all',
							blacklist: ['es6.tailCall']
						}
					}
				],
				/* Only Instrument our source files for coverage */
				loaders: [].concat( coverage ? {
					test: /\.jsx?$/,
					loader: 'isparta',
					include: /src/
				} : [])
			},
			resolve: {
				modulesDirectories: [__dirname, 'node_modules']
			},
			plugins: [
				new webpack.DefinePlugin({
					coverage: coverage
				})
			]
		},

		webpackMiddleware: {
			noInfo: true
		}
	});
};
