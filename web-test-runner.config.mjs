import { importMapsPlugin } from '@web/dev-server-import-maps';
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
	testRunnerHtml: (testRunnerImport, config) => `
	<html>
		<body>
			<script type="module">
				window.process = {
					env: {
						NODE_ENV: 'test'
					}
				};
			</script>

			<script type="module">
				import '${testRunnerImport}';
			</script>
		</body>
	</html>
`,
	mimeTypes: {
		// serve all json files as js
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
						preact: '/src/index.js'
					}
				}
			}
		}),
		babel({
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
		})
	]
};
