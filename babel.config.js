// Only used for mocha tests. For karma, see karma.config.js
module.exports = function(api) {
	api.cache(true);

	const rename = {};
	const mangle = require('./mangle.json');
	for (let prop in mangle.props.props) {
		let name = prop;
		if (name[0] === '$') {
			name = name.slice(1);
		}

		rename[name] = mangle.props.props[prop];
	}

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
		ignore: ['./dist'],
		overrides: [
			{
				test(filename) {
					const result =
						filename.endsWith('optionSpies.js') ||
						filename.endsWith('.options.test.js');
					return result;
				},
				plugins: [['babel-plugin-transform-rename-properties', { rename }]]
			}
		]
	};
};
