const path = require('path');
const webpack = require('webpack');

const env = process.env.NODE_ENV;

const config = {
	entry: {
		preact: './example/index'
	},
	output: {
		path: path.join(__dirname, 'dist'),
		filename: '[name].js',
		publicPath: '/static'
	},
	plugins: [
		new webpack.NoEmitOnErrorsPlugin(),
		new webpack.HotModuleReplacementPlugin(),
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(env)
		})
	],
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['env'],
						plugins: [
            ["transform-react-jsx", { "pragma":"h" }]
						]
					}
				}
			}
		]
	}
};

module.exports = config;
