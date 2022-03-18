module.exports = function(api) {
	api.cache(true);

	const minify = String(process.env.MINIFY) === 'true';
	const noModules = String(process.env.BABEL_NO_MODULES) === 'true';

	const rename = {};
	const mangle = require('./mangle.json');
	for (let prop in mangle.props.props) {
		let name = prop;
		if (name[0] === '$') {
			name = name.slice(1);
		}

		rename[name] = mangle.props.props[prop];
	}

	const presets = [];
	const plugins = [];

	if (process.env.SERVER === 'true') {
		presets.push([
			'@babel/preset-env',
			{
				loose: true,
				exclude: ['@babel/plugin-transform-typeof-symbol'],
				targets: {
					node: true
				}
			}
		]);

		plugins.push(
			[
				'@babel/plugin-transform-react-jsx',
				{ runtime: 'automatic', importSource: 'preact' }
			],
			['babel-plugin-transform-rename-properties', { rename }],
			[
				'module-resolver',
				{
					root: ['.'],
					alias: {
						'preact/jsx-dev-runtime': './jsx-runtime/src/index.js',
						'preact/jsx-runtime': './jsx-runtime/src/index.js',
						'preact/test-utils': './test-utils/src/index.js',
						'preact/hooks': './hooks/src/index.js',
						'preact/compat': './compat/src/index.js',
						preact: './src/index.js'
					}
				}
			]
		);
	} else {
		presets.push([
			'@babel/preset-env',
			{
				loose: true,
				// Don't transform modules when using esbuild
				modules: noModules ? false : 'auto',
				exclude: ['@babel/plugin-transform-typeof-symbol'],
				targets: {
					browsers: [
						'Firefox>=60',
						'chrome>=61',
						'and_chr>=61',
						'Safari>=10.1',
						'iOS>=10.3',
						'edge>=16',
						'opera>=48',
						'op_mob>=48',
						'Samsung>=8.2',
						'not dead'
					]
				}
			}
		]);

		plugins.push(
			'@babel/plugin-proposal-object-rest-spread',
			'@babel/plugin-transform-react-jsx',
			'babel-plugin-transform-async-to-promises',
			['babel-plugin-transform-rename-properties', { rename }]
		);
	}

	return {
		presets,
		plugins,
		include: ['**/src/**/*.js', '**/test/**/*.js'],
		overrides: [
			{
				test: /(component-stack|debug)\.test\.js$/,
				plugins: ['@babel/plugin-transform-react-jsx-source']
			}
		]
	};
};
