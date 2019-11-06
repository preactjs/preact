module.exports = function(api) {
	api.cache(true);

	return {
		presets: [
			[
				'@babel/preset-env',
				{
					loose: true,
					exclude: ['@babel/plugin-transform-typeof-symbol'],
					targets: {
						browsers: ['last 2 versions', 'IE >= 9']
					}
				}
			]
		],
		plugins: [
			'@babel/plugin-proposal-object-rest-spread',
			'@babel/plugin-transform-react-jsx',
			'babel-plugin-transform-async-to-promises'
		],
		ignore: ['./dist']
	};
};
