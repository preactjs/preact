/* eslint-disable */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const preact = path.join(__dirname, '..', 'src', 'preact.js');

module.exports = {
	context: __dirname,
	entry: './src/index',
	output: {
		publicPath: '/'
	},
	resolve: {
		alias: {
			["preact/debug"]: path.join(__dirname, '..', 'debug'),
			["preact/devtools"]: path.join(__dirname, '..', 'devtools'),
			preact: preact,
			react: 'preact-compat',
			'react-dom': 'preact-compat'
		},
		extensions: [ '.tsx', '.ts', '.js' ]
	},
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				loader: 'babel-loader',
				options: {
					sourceMap: true,
					presets: [
						[require.resolve('@babel/preset-env'), {
							targets: {
								browsers: ['last 2 versions', 'IE >= 9']
							},
							modules: false,
							loose: true
						}],
						[require.resolve('@babel/preset-react')],
					],
					plugins: [
						[require.resolve('@babel/plugin-transform-react-jsx'), { pragma: 'createElement', pragmaFrag: 'Fragment' }],
						[require.resolve('@babel/plugin-proposal-class-properties')],
						[require.resolve('@babel/plugin-transform-react-constant-elements')],
					]
				}
			},
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader',
				]
			}
		]
	},
	devtool: 'inline-source-map',
	node: {
		process: 'mock',
		Buffer: false,
		setImmediate: false
	},
	devServer: {
		historyApiFallback: true
	},
	plugins: [
		new HtmlWebpackPlugin()
	]
};
