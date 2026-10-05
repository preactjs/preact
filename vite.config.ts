import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';
import { transformAsync } from '@babel/core';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const MINIFY = process.env.MINIFY === 'true';
const COVERAGE = process.env.COVERAGE === 'true';

const root = path.resolve(import.meta.dirname);

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
	{
		find: /^react\/jsx-runtime$/,
		replacement: path.join(root, 'compat/jsx-runtime.mjs')
	},
	{
		find: /^react\/jsx-dev-runtime$/,
		replacement: path.join(root, 'compat/jsx-dev-runtime.mjs')
	},
	{
		find: /^preact$/,
		replacement: MINIFY
			? path.join(root, 'dist/preact.mjs')
			: path.join(root, 'src/index.js')
	},
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
		find: /^preact\/devtools$/,
		replacement: MINIFY
			? path.join(root, 'devtools/dist/devtools.mjs')
			: path.join(root, 'devtools/src/index.js')
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

const rename: Record<string, string> = {};
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
	staged: {
		'**/*.{js,jsx,mjs,cjs,ts,tsx,yml,json,html,md,css,scss}':
			'vp fmt --write --no-error-on-unmatched-pattern'
	},
	fmt: {
		endOfLine: 'lf',
		insertFinalNewline: true,
		useTabs: true,
		tabWidth: 2,
		printWidth: 80,
		singleQuote: true,
		jsxSingleQuote: false,
		quoteProps: 'as-needed',
		trailingComma: 'none',
		semi: true,
		arrowParens: 'avoid',
		bracketSameLine: false,
		bracketSpacing: true,
		singleAttributePerLine: false,
		experimentalSortPackageJson: false,
		ignorePatterns: [
			'benchmarks/**',
			'**/.DS_Store',
			'**/node_modules',
			'**/npm-debug.log',
			'**/dist',
			'*/package-lock.json',
			'**/yarn.lock',
			'**/.vscode',
			'**/.idea',
			'test/ts/**/*.js',
			'**/coverage',
			'**/*.sw[op]',
			'**/*.log',
			'**/package/',
			'**/preact-*.tgz',
			'**/preact.tgz',
			'**/package-lock.json'
		],
		overrides: [
			{
				files: ['*.json', '.*rc', '*.yml'],
				options: {
					useTabs: false,
					tabWidth: 2
				}
			}
		]
	},
	lint: {
		ignorePatterns: ['**/dist/**', 'benchmarks/**'],
		rules: {
			'no-unused-vars': [
				2,
				{
					args: 'none',
					caughtErrors: 'none',
					varsIgnorePattern: '^h|React|createElement|Fragment$'
				}
			],
			'typescript/no-namespace': 0,
			'no-constant-binary-expression': 0,
			'no-useless-catch': 0,
			'no-empty-pattern': 0,
			'prefer-rest-params': 0,
			'prefer-spread': 0,
			'no-cond-assign': 0,
			'react/no-danger': 0,
			'react/no-danger-with-children': 0,
			'jest/valid-expect': 0,
			'jest/no-disabled-tests': 0,
			'jest/expect-expect': 0,
			'jest/no-standalone-expect': 0,
			'jest/no-export': 0,
			'react/no-find-dom-node': 0,
			'react/no-direct-mutation-state': 0,
			'react/no-children-prop': 0,
			'react/jsx-key': 0,
			'react/no-string-refs': 0,
			'react/require-render-return': 0,
			'unicorn/no-new-array': 0,
			'unicorn/prefer-string-starts-ends-with': 0,
			'vite-plus/prefer-vite-plus-imports': 'error'
		},
		jsPlugins: [
			{
				name: 'vite-plus',
				specifier: 'vite-plus/oxlint-plugin'
			}
		]
	},
	resolve: {
		alias: rollupAlias,
		dedupe: ['preact']
	},
	oxc: {
		include: /.*\.jsx$/,
		exclude: ['node_modules'],
		jsx: {
			runtime: 'classic',
			development: false,
			pragma: 'createElement',
			pragmaFrag: 'Fragment'
		}
	},
	plugins: [
		{
			name: 'rename-mangle-properties',
			async transform(code, id) {
				if (id.includes('node_modules')) {
					return null;
				}

				const shouldTransform = id.includes('src') || id.includes('test');
				if (!shouldTransform) {
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
					include: ['**/src/**/*.js', '**/test/**/*.js', '**/test/**/*.jsx']
				});

				if (!transformed?.code) {
					return null;
				}

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
			'react-dom',
			'react/jsx-runtime',
			'react/jsx-dev-runtime'
		]
	},
	test: {
		cache: false,
		globals: true,
		pool: 'threads',
		coverage: {
			enabled: COVERAGE,
			include: MINIFY
				? [
						'dist/preact.mjs',
						'compat/dist/compat.mjs',
						'devtools/dist/devtools.mjs',
						'jsx-runtime/dist/jsxRuntime.mjs',
						'debug/dist/debug.mjs',
						'hooks/dist/hooks.mjs',
						'test-utils/dist/testUtils.mjs'
					]
				: [
						'src/**/*',
						'debug/src/**/*',
						'devtools/src/**/*',
						'hooks/src/**/*',
						'compat/src/**/*',
						'jsx-runtime/src/**/*',
						'test-utils/src/**/*'
					],
			exclude: ['**/*.d.ts'],
			extension: ['.js', '.mjs'],
			provider: 'v8',
			reporter: ['html', 'lcovonly', 'text-summary'],
			reportsDirectory: './coverage'
		},
		projects: [
			{
				extends: true,
				test: {
					include: ['./test/{shared,node,ts}/**/*.test.js?(x)']
				}
			},
			{
				extends: true,
				test: {
					include: [
						'{debug,devtools,hooks,compat,test-utils,jsx-runtime}/test/{browser,shared}/**/*.test.js?(x)',
						'./test/{browser,shared}/**/*.test.js?(x)'
					],
					setupFiles: ['./vitest.setup.js'],
					// dangerouslyIgnoreUnhandledErrors: true,
					browser: {
						// TODO: isolate doesn't work it leaks across all pages
						// isolate: false,
						provider: playwright(),
						enabled: true,
						screenshotFailures: false,
						headless: true,
						instances: [{ browser: 'chromium' }]
					}
				}
			}
		]
	}
});
