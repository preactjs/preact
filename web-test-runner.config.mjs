import { importMapsPlugin } from '@web/dev-server-import-maps';
import { legacyPlugin } from '@web/dev-server-legacy';
import { createSauceLabsLauncher } from '@web/test-runner-saucelabs';
import rollupBabel from '@rollup/plugin-babel';
import { fromRollup } from '@web/dev-server-rollup';
import fs from 'fs';
import os from 'os';

let browsers;
const sauceLabsUser = process.env.SAUCE_USERNAME;
const sauceLabsKey = process.env.SAUCE_ACCESS_KEY;
const sauceLabs = sauceLabsUser && sauceLabsKey;
if (sauceLabs) {
	const sauceLabsCapabilities = {
		name: 'unit-tests',
		// if you are running tests in a CI, the build id might be available as an
		// environment variable. this is useful for identifying test runs
		// this is for example the name for github actions
		build: `CI #${process.env.GITHUB_RUN_NUMBER} (${process.env.GITHUB_RUN_ID})`
	};
	const sauceLabsLauncher = createSauceLabsLauncher(
		{
			user: sauceLabsUser,
			key: sauceLabsKey,
			region: 'eu-central-1'
		},
		sauceLabsCapabilities
	);

	browsers = [
		sauceLabsLauncher({
			browserName: 'internet explorer',
			browserVersion: '11.0',
			platformName: 'Windows 7'
		}),
		sauceLabsLauncher({
			browserName: 'chrome',
			browserVersion: 'latest',
			platformName: 'Windows 10'
		}),
		sauceLabsLauncher({
			browserName: 'MicrosoftEdge',
			browserVersion: 'latest',
			platformName: 'Windows 10'
		}),
		sauceLabsLauncher({
			browserName: 'firefox',
			browserVersion: 'latest',
			platformName: 'Windows 10'
		})
	];
}

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
	files: [
		'{debug/test,hooks/test,compat/test,test-utils/test,test}/{browser,shared}/{**/*,*}.test.{js,jsx}'
	],
	mimeTypes: {
		'**/*.jsx': 'js'
	},
	browsers,
	// How many browsers to test concurrently.=
	// SauceLabs only allows a max concurrency of 2 in the OSS plan, locally 2 is good as well
	concurrentBrowsers: 2,
	// How many test files to test concurrent per browser.=
	// Limit SauceLabs to 6 concurrent tests, take half CPUs locally
	concurrency: sauceLabs ? 6 : os.cpus().length / 2,
	// SauceLabs tests take a bit longer
	browserStartTimeout: 1000 * 60 * 5,
	testsStartTimeout: 1000 * 60 * 5,
	testsFinishTimeout: 1000 * 60 * 5,
	testFramework: {
		config: {
			timeout: 5000
		}
	},
	plugins: [
		importMapsPlugin({
			inject: {
				importMap: {
					imports: {
						chai: '/test/chai.js',
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
			sourceMaps: 'inline',
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
		// compiles to es5 and add polyfills on browsers that don't support modules
		legacyPlugin({
			polyfills: {
				// needed for es5
				regeneratorRuntime: 'always',
				// needed by WTR
				fetch: true,
				// polyfill Promise and others
				coreJs: true,

				// disable defaults
				abortController: false,
				webcomponents: false
			}
		})
	]
};
