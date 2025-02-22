import { defineConfig } from 'vitest/config';
import { transformAsync } from '@babel/core';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';

const root = path.resolve(__dirname);
const alias = {
	'^react$': path.join(root, 'compat/src/index.js'),
	'^react-dom$': path.join(root, 'compat/src/index.js'),
	'^preact$': path.join(root, 'src/index.js'),
	'^preact/compat$': path.join(root, 'compat/src/index.js'),
	'^preact/jsx-runtime$': path.join(root, 'jsx-runtime/src/index.js'),
	'^preact/jsx-runtime/src$': path.join(root, 'jsx-runtime/src'),
	'^preact/jsx-dev-runtime$': path.join(root, 'jsx-dev-runtime/src/index.js'),
	'^preact/debug$': path.join(root, 'debug/src/index.js'),
	'^preact/hooks$': path.join(root, 'hooks/src/index.js'),
	'^preact/test-utils$': path.join(root, 'test-utils/src/index.js')
};

const rename = {};
const mangle = readFileSync('./mangle.json', 'utf8');
const mangleJson = JSON.parse(mangle);
for (let prop in mangleJson.props.props) {
	let name = prop;
	if (name[0] === '$') {
		name = name.slice(1);
	}

	rename[name] = mangleJson.props.props[prop];
}

export default defineConfig({
	resolve: {
		alias,
		dedupe: ['preact']
	},
	esbuild: {
		loader: 'jsx',
		include: /.*\.js$/,
		exclude: ['node_nodules'],
		jsx: 'transform',
		jsxImportSource: 'preact',
		jsxDev: true
	},
	plugins: [
		{
			name: 'rename-mangle-properties',
			async transform(code, id) {
				if (id.includes('node_modules')) {
					return null;
				}

				const transformed = await transformAsync(code, {
					filename: id,
					configFile: false,
					plugins: [
						[
							'babel-plugin-transform-rename-properties',
							{
								rename
							}
						]
					],
					include: ['**/src/**/*.js', '**/test/**/*.js'],
					overrides: [
						{
							test: /(component-stack|debug)\.test\.js$/,
							plugins: ['@babel/plugin-transform-react-jsx-source']
						}
					]
				});

				return {
					code: transformed.code,
					map: transformed.map
				};
			}
		}
	],
	optimizeDeps: {
		exclude: [
			'preact',
			'preact/compat',
			'preact/test-utils',
			'preact/debug',
			'preact/hooks',
			'preact/devtools',
			'preact/jsx-runtime',
			'preact/jsx-dev-runtime',
			'preact-router',
			'react',
			'react-dom'
		],
		esbuildOptions: {
			alias,
			plugins: [
				{
					name: 'load-js-files-as-jsx',
					setup(build) {
						build.onLoad({ filter: /.*\.js$/ }, async args => {
							return {
								loader: 'jsx',
								contents: await fs.readFile(args.path, 'utf8')
							};
						});
					}
				}
			]
		}
	},
	test: {
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'json', 'html']
		},
		setupFiles: ['./vitest.setup.js'],
		globals: true,
		browser: {
			provider: 'webdriverio', // or 'webdriverio'
			enabled: true,
			screenshotFailures: false,
			headless: true,
			// at least one instance is required
			instances: [{ browser: 'chrome' }]
		}
	}
});
