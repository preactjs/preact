/* eslint-disable */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ceviche = path.resolve(__dirname, '../src');

module.exports = {
	context: __dirname,
	entry: './index',
	output: {
		publicPath: '/'
	},
	resolve: {
		alias: {
			ceviche: ceviche,
			preact: path.resolve(__dirname, './preact'),
			react: ceviche,
			'react-dom': ceviche
		}
	},
	module: {
		rules: [
			{
				test: /\.js$/,
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
						require.resolve('@babel/preset-react'),
						require.resolve('@babel/preset-stage-0')
					],
					plugins: [
						[require.resolve('@babel/plugin-transform-react-jsx'), { pragma: 'createElement', pragmaFrag: 'Fragment' }],
						require.resolve('@babel/plugin-transform-react-constant-elements'),
						[require.resolve('babel-plugin-jsx-pragmatic'), {
							module: 'ceviche',
							export: 'createElement',
							import: 'createElement'
						}]
					]
				}
			},
			{
				test: /\.s?css$/,
				use: [
					'style-loader',
					'css-loader',
					'sass-loader'
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
