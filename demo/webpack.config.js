const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	context: __dirname,
	entry: './index',
	module: {
		rules: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				options: {
					presets: [
						[require.resolve('babel-preset-env'), {
							targets: {
								browsers: ['last 2 versions', 'IE >= 9']
							},
							modules: false,
							loose: true
						}]
					],
					plugins: [
						[require.resolve('babel-plugin-transform-react-jsx'), { pragma: 'createElement' }]
					]
				}
			}
		]
	},
	devtool: 'inline-source-map',
	node: {
		process: 'mock',
		Buffer: false,
		setImmediate: false
	},
	plugins: [
		new HtmlWebpackPlugin()
	]
};
