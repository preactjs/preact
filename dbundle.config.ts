import { playwrightRunner } from '@dbundle/runner-playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;

// Build property rename map from mangle.json
const mangleJson = JSON.parse(readFileSync('./mangle.json', 'utf8'));
const rename: Record<string, string> = {};
for (const prop in mangleJson.props.props) {
	const name = prop.startsWith('$') ? prop.slice(1) : prop;
	rename[name] = mangleJson.props.props[prop];
}

// Module aliases — point bare specifiers to source
const aliases: Record<string, string> = {
	preact: path.join(root, 'src/index.js'),
	'preact/compat': path.join(root, 'compat/src/index.js'),
	'preact/debug': path.join(root, 'debug/src/index.js'),
	'preact/devtools': path.join(root, 'devtools/src/index.js'),
	'preact/hooks': path.join(root, 'hooks/src/index.js'),
	'preact/test-utils': path.join(root, 'test-utils/src/index.js'),
	'preact/jsx-runtime': path.join(root, 'jsx-runtime/src/index.js'),
	'preact/jsx-runtime/src': path.join(root, 'jsx-runtime/src'),
	'preact/jsx-dev-runtime': path.join(root, 'jsx-runtime/src/index.js'),
	react: path.join(root, 'compat/src/index.js'),
	'react-dom': path.join(root, 'compat/src/index.js')
};

export default {
	// transform: {
	//   jsx: {
	//     runtime: "classic",
	//     factory: "createElement",
	//     fragment: "Fragment",
	//   },
	// },
	plugins: [
		// Resolve preact/react bare specifiers to source
		{
			name: 'preact-aliases',
			setup(build) {
				const filter = new RegExp(
					'^(' +
						Object.keys(aliases)
							.map(k => k.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'))
							.join('|') +
						')$'
				);

				build.onResolve({ filter }, args => {
					const replacement = aliases[args.specifier];
					if (replacement) {
						return { path: replacement };
					}
					return null;
				});
			}
		}
		// Property mangling via babel
		// {
		// 	name: "preact-mangle-properties",
		// 	setup(build) {
		// 		build.onTransform(
		// 			{ filter: /\.(js|jsx|ts|tsx)$/ },
		// 			async (args) => {
		// 				if (args.path.includes("node_modules")) return null;
		// 				if (
		// 					!args.path.includes("src") &&
		// 					!args.path.includes("test")
		// 				) {
		// 					return null;
		// 				}

		// 				const { transformAsync } = await import("@babel/core");
		// 				const result = await transformAsync(args.text, {
		// 					filename: args.path,
		// 					configFile: false,
		// 					plugins: [
		// 						[
		// 							"babel-plugin-transform-rename-properties",
		// 							{ rename },
		// 						],
		// 					],
		// 				});

		// 				if (!result?.code) return null;
		// 				return { text: result.code };
		// 			},
		// 		);
		// 	},
		// },
	],
	test: [
		{
			name: 'unit',
			include: [
				'./test/shared/**/*.test.{js,jsx}',
				'./test/node/**/*.test.{js,jsx}',
				'./test/ts/**/*.test.{tsx,jsx}'
			],
			globals: true
		},
		{
			name: 'browser',
			include: [
				'test/browser/**/*.test.{js,jsx}',
				'compat/test/browser/**/*.test.{js,jsx}',
				'debug/test/browser/**/*.test.{js,jsx}',
				'devtools/test/browser/**/*.test.{js,jsx}',
				'hooks/test/browser/**/*.test.{js,jsx}',
				'test-utils/test/shared/**/*.test.{js,jsx}',
				'jsx-runtime/test/**/*.test.{js,jsx}'
			],
			globals: true,
			setup: ['./vitest.setup.js'],
			runner: playwrightRunner({ browser: 'chromium' })
		}
	]
};
