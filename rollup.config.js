import npm from 'rollup-plugin-npm';
import babel from 'rollup-plugin-babel';
import memory from 'rollup-plugin-memory';

export default {
	exports: 'named',
	plugins: [
		memory({
			path: 'src/preact',
			contents: "export { h, Component, render, rerender, options } from './preact';"
		}),
		npm({
			main: true
		}),
		babel({
			sourceMap: true,
			loose: 'all',
			blacklist: ['es6.tailCall'],
			exclude: 'node_modules/**'
		})
	]
};
