import { importMapsPlugin } from '@web/dev-server-import-maps';
import { legacyPlugin } from '@web/dev-server-legacy';
import rollupBabel from '@rollup/plugin-babel';
import { fromRollup } from '@web/dev-server-rollup';
import fs from 'fs';

const rename = {};
const mangle = JSON.parse(fs.readFileSync('./mangle.json', 'utf8'));
for (let prop in mangle.props.props) {
	let name = prop;
	if (name[0] === '$') {
		name = name.slice(1);
	}

	rename[name] = mangle.props.props[prop];
}

const babel = fromRollup(rollupBabel.default);

export default {
	nodeResolve: true,
	mimeTypes: {
		'**/*.jsx': 'js'
	},
	plugins: [
		importMapsPlugin({
			inject: {
				importMap: {
					imports: {
						'preact/compat': '/compat/src/index.js',
						'preact/debug': '/debug/src/index.js',
						'preact/devtools': '/devtools/src/index.js',
						'preact/hooks': '/hooks/src/index.js',
						'preact/test-utils': '/test-utils/src/index.js',
						preact: '/src/index.js',
						'prop-types': '/node_modules/prop-types/prop-types.js'
					}
				}
			}
		}),
		babel({
			exclude: ['node_modules/**'],
			babelHelpers: 'inline',
			plugins: [
				'@babel/plugin-syntax-dynamic-import',
				'@babel/plugin-syntax-import-meta',
				['babel-plugin-transform-rename-properties', { rename }],
				[
					'@babel/plugin-transform-react-jsx',
					{ pragma: 'createElement', pragmaFrag: 'Fragment' }
				]
			]
		}),
		legacyPlugin()
	]
};
