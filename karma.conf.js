/*eslint no-var:0, object-shorthand:0 */

var coverage = String(process.env.COVERAGE) === 'true',
	minify = String(process.env.MINIFY) === 'true',
	ci = String(process.env.CI).match(/^(1|true)$/gi),
	pullRequest = String(process.env.GITHUB_EVENT_NAME) === 'pull_request',
	masterBranch = String(process.env.GITHUB_WORKFLOW) === 'CI-master',
	sauceLabs = ci && !pullRequest && masterBranch,
	performance = !coverage && String(process.env.PERFORMANCE) !== 'false',
	webpack = require('webpack'),
	path = require('path');

var sauceLabsLaunchers = {
	sl_chrome: {
		base: 'SauceLabs',
		browserName: 'chrome',
		platform: 'Windows 10'
	},
	sl_firefox: {
		base: 'SauceLabs',
		browserName: 'firefox',
		platform: 'Windows 10'
	},
	// TODO: Safari always fails and disconnects before any tests are executed.
	// This seems to be an issue with Saucelabs and they're actively investigating
	// that (see: https://mobile.twitter.com/bromann/status/1136323458328084482).
	// We'll disable Safari for now until that's resolved.
	// sl_safari: {
	// 	base: 'SauceLabs',
	// 	browserName: 'Safari',
	// 	version: '11',
	// 	platform: 'OS X 10.13'
	// },
	sl_edge: {
		base: 'SauceLabs',
		browserName: 'MicrosoftEdge',
		platform: 'Windows 10'
	},
	sl_ie_11: {
		base: 'SauceLabs',
		browserName: 'internet explorer',
		version: '11.0',
		platform: 'Windows 7'
	}
};

var localLaunchers = {
	ChromeNoSandboxHeadless: {
		base: 'Chrome',
		flags: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			// See https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
			'--headless',
			'--disable-gpu',
			'--no-gpu',
			// Without a remote debugging port, Google Chrome exits immediately.
			'--remote-debugging-port=9333'
		]
	}
};

const subPkgPath = pkgName =>
	path.join(__dirname, pkgName, !minify ? 'src' : '');

module.exports = function(config) {
	config.set({
		browsers: sauceLabs
			? Object.keys(sauceLabsLaunchers)
			: Object.keys(localLaunchers),

		frameworks: ['mocha', 'chai-sinon'],

		reporters: ['mocha'].concat(
			coverage ? 'coverage' : [],
			sauceLabs ? 'saucelabs' : []
		),

		coverageReporter: {
			dir: path.join(__dirname, 'coverage'),
			reporters: [
				{ type: 'text-summary' },
				{ type: 'html' },
				{ type: 'lcovonly', subdir: '.', file: 'lcov.info' }
			]
		},

		mochaReporter: {
			showDiff: true
		},

		browserLogOptions: { terminal: true },
		browserConsoleLogOptions: { terminal: true },

		browserNoActivityTimeout: 5 * 60 * 1000,

		// Use only two browsers concurrently, works better with open source Sauce Labs remote testing
		concurrency: 2,

		captureTimeout: 0,

		sauceLabs: {
			build: `CI #${process.env.GITHUB_RUN_NUMBER} (${process.env.GITHUB_RUN_ID})`,
			tunnelIdentifier:
				process.env.GITHUB_RUN_NUMBER ||
				`local${require('./package.json').version}`,
			connectLocationForSERelay: 'localhost',
			connectPortForSERelay: 4445,
			startConnect: !!sauceLabs
		},

		customLaunchers: sauceLabs ? sauceLabsLaunchers : localLaunchers,

		files: [
			{ pattern: 'test/polyfills.js', watched: false },
			{
				pattern:
					config.grep ||
					'{debug,hooks,compat,test-utils,}/test/{browser,shared}/**/*.test.js',
				watched: false
			}
		],

		preprocessors: {
			'{debug,hooks,compat,test-utils,}/test/**/*': ['webpack', 'sourcemap']
		},

		webpack: {
			output: {
				filename: '[name].js'
			},
			mode: 'development',
			devtool: 'inline-source-map',
			module: {
				noParse: [/benchmark\.js$/],

				/* Transpile source and test files */
				rules: [
					// Special case for sinon.js which ships ES2015+ code in their
					// esm bundle
					{
						test: /node_modules\/sinon\/.*\.jsx?$/,
						loader: 'babel-loader'
					},

					{
						test: /\.jsx?$/,
						exclude: /node_modules/,
						loader: 'babel-loader',
						options: {
							plugins: [
								coverage && [
									'istanbul',
									{ include: minify ? '**/dist/**/*.js' : '**/src/**/*.js' }
								]
							].filter(Boolean)
						}
					}
				]
			},
			resolve: {
				// The React DevTools integration requires preact as a module
				// rather than referencing source files inside the module
				// directly
				alias: {
					'preact/debug': subPkgPath('./debug/'),
					'preact/devtools': subPkgPath('./devtools/'),
					'preact/compat': subPkgPath('./compat/'),
					'preact/hooks': subPkgPath('./hooks/'),
					'preact/test-utils': subPkgPath('./test-utils/'),
					preact: subPkgPath('')
				}
			},
			plugins: [
				new webpack.DefinePlugin({
					coverage: coverage,
					NODE_ENV: JSON.stringify(process.env.NODE_ENV || ''),
					ENABLE_PERFORMANCE: performance
				})
			],
			performance: {
				hints: false
			}
		},

		webpackMiddleware: {
			noInfo: true,
			stats: 'errors-only'
		}
	});
};
