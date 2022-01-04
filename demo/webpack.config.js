/* eslint-disable */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const preact = path.join(__dirname, '..');
const compat = path.join(__dirname, '..', 'compat');

module.exports = {
	mode: 'development',
	context: __dirname,
	entry: './index',
	output: {
		publicPath: '/'
	},
	resolve: {
		alias: {
			preact: preact,
			preact$: preact,
			react: compat,
			'react-dom': compat
		},
		extensions: ['.tsx', '.ts', '.js']
	},
	module: {
		rules: [
			{
				test: /\.([mc]?js|ts)x?$/,
				loader: 'babel-loader',
				options: {
					sourceMap: true,
					presets: [
						[
							require.resolve('@babel/preset-typescript'),
							{ jsxPragma: 'createElement', jsxPragmaFrag: 'Fragment' }
						],
						[
							require.resolve('@babel/preset-env'),
							{
								targets: {
									browsers: ['last 2 versions', 'IE >= 9']
								},
								modules: false,
								loose: true
							}
						],
						[require.resolve('@babel/preset-react')]
					],
					plugins: [
						[require.resolve('@babel/plugin-transform-runtime')],
						[require.resolve('@babel/plugin-transform-react-jsx-source')],
						[
							require.resolve('@babel/plugin-transform-react-jsx'),
							{ pragma: 'createElement', pragmaFrag: 'Fragment' }
						],
						[
							require.resolve('@babel/plugin-proposal-decorators'),
							{ legacy: true }
						],
						[
							require.resolve('@babel/plugin-proposal-class-properties'),
							{ loose: true }
						]
					]
				}
			},
			{
				test: /\.s?css$/,
				use: ['style-loader', 'css-loader', 'sass-loader']
			}
		]
	},
	// devtool: 'inline-source-map',
	devServer: {
		historyApiFallback: true
	},
	plugins: [
		new HtmlWebpackPlugin({
			showErrors: false
		})
	]
};
