var path = require('path');

module.exports = function(config) {
	config.set({
		frameworks: ['mocha', 'chai-sinon'],
		reporters: ['mocha'],

		browsers: ['PhantomJS'],

		files: [
			'preact.js',
			'test/browser/**.js',
			'test/shared/**.js'
		],

		preprocessors: {
			'test/**/*.js': ['webpack'],
			'**/*.js': ['sourcemap']
		},

		webpack: {
			module: {
				// noParse: [/(^|\/)(node_modules|~)(\/|$)/],
				// noParse: [
				// 	/\bsinon\b/i
				// ],
				loaders: [
					{
						test: /\.jsx?$/,
						// exclude: /(^|\/)(node_modules|~)(\/|$)/,
						loader: 'babel?optional=runtime&stage=0'
					}
				]
			},
			resolve: {
				modulesDirectories: [__dirname, 'node_modules'],
				//alias: { preact: path.join(__dirname, 'preact.js') }
				// alias: { sinon: path.join(__dirname, 'node_modules', 'sinon', 'pkg', 'sinon.js') }
			}
			// webpack configuration
		},

		webpackMiddleware: {
			noInfo: true
		}
	});
};
