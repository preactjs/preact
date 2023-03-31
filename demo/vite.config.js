import { defineConfig } from 'vite';
import path from 'path';

const root = path.join(__dirname, '..');
const resolvePkg = (...parts) => path.join(root, ...parts, 'src', 'index.js');

// https://vitejs.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig({
	optimizeDeps: {
		exclude: [
			'preact',
			'preact/compat',
			'preact/debug',
			'preact/hooks',
			'preact/devtools',
			'preact/jsx-runtime',
			'preact/jsx-dev-runtime',
			'preact-router',
			'react',
			'react-dom'
		]
	},
	resolve: {
		alias: {
			'preact/debug/src/debug': path.join(root, 'debug', 'src', 'debug'),
			'preact/devtools/src/devtools': path.join(
				root,
				'devtools',
				'src',
				'devtools'
			),
			//'preact/debug': resolvePkg('debug'),
			'preact/devtools': resolvePkg('devtools'),
			'preact/hooks': resolvePkg('hooks'),
			'preact/jsx-runtime': resolvePkg('jsx-runtime'),
			'preact/jsx-dev-runtime': resolvePkg('jsx-runtime'),
			preact: resolvePkg(''),
			'react-dom': resolvePkg('compat'),
			react: resolvePkg('compat')
		}
	},
	esbuild: {
		jsx: 'automatic',
		jsxImportSource: 'preact'
	}
});
