import { defineConfig } from 'vitest/config';
import { transformAsync } from '@babel/core';
import fs from 'fs/promises';
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

export default defineConfig({
	resolve: {
		alias,
		dedupe: ['preact']
	},
	esbuild: {
		loader: 'jsx',
		include: /.*\.js$/,
		exclude: ['node_nodules']
	},
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
					name: 'rename-mangle-properties',
					setup(build) {
						build.onLoad({ filter: /\.test\.js$/ }, async args => {
							if (args.path.includes('node_modules')) {
								return null;
							}

							const contents = await fs.readFile(args.path, 'utf-8');
							const transformed = await transformAsync(contents, {
								filename: args.path,
								plugins: ['babel-plugin-transform-rename-properties']
							});

							return {
								loader: 'jsx',
								contents: transformed.code
							};
						});
					}
				},
				{
					name: 'load-js-files-as-jsx',
					setup(build) {
						build.onLoad({ filter: /.*\.js$/ }, async args => ({
							loader: 'jsx',
							contents: await fs.readFile(args.path, 'utf8')
						}));
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
