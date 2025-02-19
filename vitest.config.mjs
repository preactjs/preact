import { defineConfig } from 'vitest/config';
import path from 'path';
const root = path.resolve(__dirname);
const alias = {
	'^react$': 'preact/compat',
	'^react-dom$': 'preact/compat',
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
		alias
	},
	esbuild: {
		loader: 'jsx',
		include: /.*\.js$/,
		exclude: []
	},
	optimizeDeps: {
		esbuildOptions: {
			alias,
			plugins: [
				{
					name: 'load-js-files-as-jsx',
					setup(build) {
						build.onLoad({ filter: /.*\.js$/ }, async args => ({
							loader: 'jsx',
							contents: await import('fs/promises').then(fs =>
								fs.readFile(args.path, 'utf8')
							)
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
		alias,
		browser: {
			provider: 'webdriverio', // or 'webdriverio'
			enabled: true,
			headless: true,
			// at least one instance is required
			instances: [{ browser: 'chrome' }]
		}
	}
});
