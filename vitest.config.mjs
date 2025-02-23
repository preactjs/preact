import { defineConfig } from 'vitest/config';
import { transformAsync } from '@babel/core';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';

const MINIFY = process.env.MINIFY === 'true';

const root = path.resolve(__dirname);
const alias = {
	'^react$': path.join(
		root,
		MINIFY ? 'compat/dist/compat.js' : 'compat/src/index.js'
	),
	'^react-dom$': path.join(
		root,
		MINIFY ? 'compat/dist/compat.js' : 'compat/src/index.js'
	),
	'^preact$': path.join(root, MINIFY ? 'dist/preact.js' : 'src/index.js'),
	'^preact/compat$': path.join(
		root,
		MINIFY ? 'compat/dist/compat.js' : 'compat/src/index.js'
	),
	'^preact/jsx-runtime$': path.join(
		root,
		MINIFY ? 'jsx-runtime/dist/jsxRuntime.js' : 'jsx-runtime/src/index.js'
	),
	'^preact/jsx-runtime/src$': path.join(
		root,
		MINIFY ? 'jsx-runtime/dist/jsxRuntime.js' : 'jsx-runtime/src'
	),
	'^preact/jsx-dev-runtime$': path.join(
		root,
		MINIFY
			? 'jsx-dev-runtime/dist/jsx-dev-runtime.js'
			: 'jsx-dev-runtime/src/index.js'
	),
	'^preact/debug$': path.join(
		root,
		MINIFY ? 'debug/dist/debug.js' : 'debug/src/index.js'
	),
	'^preact/hooks$': path.join(
		root,
		MINIFY ? 'hooks/dist/hooks.js' : 'hooks/src/index.js'
	),
	'^preact/test-utils$': path.join(
		root,
		MINIFY ? 'test-utils/dist/testUtils.js' : 'test-utils/src/index.js'
	)
};

const rollupAlias = [
	{
		find: /^react$/,
		replacement: MINIFY
			? path.join(root, 'compat/dist/compat.mjs')
			: path.join(root, 'compat/src/index.js')
	},
	{
		find: /^react-dom$/,
		replacement: MINIFY
			? path.join(root, 'compat/dist/compat.mjs')
			: path.join(root, 'compat/src/index.js')
	},
	{ find: /^preact$/, replacement: path.join(root, 'src/index.js') },
	{
		find: /^preact\/compat$/,
		replacement: MINIFY
			? path.join(root, 'compat/dist/compat.mjs')
			: path.join(root, 'compat/src/index.js')
	},
	{
		find: /^preact\/jsx-runtime$/,
		replacement: MINIFY
			? path.join(root, 'jsx-runtime/dist/jsxRuntime.mjs')
			: path.join(root, 'jsx-runtime/src/index.js')
	},
	{
		find: /^preact\/jsx-runtime\/src$/,
		replacement: MINIFY
			? path.join(root, 'jsx-runtime/dist/jsxRuntime.mjs')
			: path.join(root, 'jsx-runtime/src')
	},
	{
		find: /^preact\/jsx-dev-runtime$/,
		replacement: MINIFY
			? path.join(root, 'jsx-runtime/dist/jsxRuntime.mjs')
			: path.join(root, 'jsx-runtime/src/index.js')
	},
	{
		find: /^preact\/debug$/,
		replacement: MINIFY
			? path.join(root, 'debug/dist/debug.mjs')
			: path.join(root, 'debug/src/index.js')
	},
	{
		find: /^preact\/hooks$/,
		replacement: MINIFY
			? path.join(root, 'hooks/dist/hooks.mjs')
			: path.join(root, 'hooks/src/index.js')
	},
	{
		find: /^preact\/test-utils$/,
		replacement: MINIFY
			? path.join(root, 'test-utils/dist/testUtils.mjs')
			: path.join(root, 'test-utils/src/index.js')
	}
];

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
		alias: rollupAlias,
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
					include: ['**/src/**/*.js', '**/test/**/*.js']
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
			enabled: true,
			include: [
				'**/src/**/*',
				'**/debug/src/**/*',
				'**/hooks/src/**/*',
				'**/compeat/src/**/*',
				'**/jsx-runtime/src/**/*',
				'**/test-utils/src/**/*'
			],
			extension: ['.js'],
			provider: 'istanbul',
			reporter: ['html', 'lcovonly', 'text-summary'],
			reportsDirectory: './coverage'
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
