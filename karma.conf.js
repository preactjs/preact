module.exports = function(config) {
	config.set({
		frameworks: ['mocha'],
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
				loaders: [
					{
						test: /\.jsx?$/,
						loader: 'babel?optional=runtime&stage=0'
					}
				]
			},
			resolve: {
				modulesDirectories: [__dirname, 'node_modules']
				//alias: { preact: path.join(__dirname, 'preact.js') }
			}
			// webpack configuration
		},

		webpackMiddleware: {
			noInfo: true
		}
	});
};
