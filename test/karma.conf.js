/*eslint no-var:0, object-shorthand:0 */

var coverage = String(process.env.COVERAGE)!=='false',
	sauceLabs = String(process.env.SAUCELABS).match(/^(1|true)$/gi) && String(process.env.TRAVIS_PULL_REQUEST)!=='true',
	performance = !coverage && !sauceLabs && String(process.env.PERFORMANCE)!=='false',
	webpack = require('webpack');

var sauceLabsLaunchers = {
	sl_chrome: {
		base: 'SauceLabs',
		browserName: 'chrome'
	},
	sl_firefox: {
		base: 'SauceLabs',
		browserName: 'firefox'
	},
	sl_ios_safari: {
		base: 'SauceLabs',
		browserName: 'iphone',
		platform: 'OS X 10.9',
		version: '7.1'
	},
	sl_ie_11: {
		base: 'SauceLabs',
		browserName: 'internet explorer',
		version: '11'
	},
	sl_ie_10: {
		base: 'SauceLabs',
		browserName: 'internet explorer',
		version: '10'
	},
	sl_ie_9: {
		base: 'SauceLabs',
		browserName: 'internet explorer',
		version: '9'
	}
};

module.exports = function(config) {
	config.set({
		browsers: sauceLabs ? Object.keys(sauceLabsLaunchers) : ['PhantomJS'],

		frameworks: ['source-map-support', 'mocha', 'chai-sinon'],

		reporters: ['mocha'].concat(
			coverage ? 'coverage' : [],
			sauceLabs ? 'saucelabs' : []
		),

		coverageReporter: {
			reporters: [
				{
					type: 'text-summary'
				},
				{
					type: 'html',
					dir: __dirname+'/../coverage'
				}
			]
		},

		mochaReporter: {
			showDiff: true
		},

		browserLogOptions: { terminal: true },
		browserConsoleLogOptions: { terminal: true },

		browserNoActivityTimeout: 5 * 60 * 1000,

		// sauceLabs: {
		// 	tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER || ('local'+require('./package.json').version),
		// 	startConnect: false
		// },

		customLaunchers: sauceLabsLaunchers,

		files: [
			{ pattern: '{browser,shared}/**.js', watched: false }
		],

		preprocessors: {
			'**/*': ['webpack', 'sourcemap']
		},

		webpack: {
			devtool: 'inline-source-map',
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
					coverage: coverage,
					ENABLE_PERFORMANCE: performance,
					DISABLE_FLAKEY: !!String(process.env.FLAKEY).match(/^(0|false)$/gi)
				})
			]
		},

		webpackMiddleware: {
			noInfo: true
		}
	});
};
