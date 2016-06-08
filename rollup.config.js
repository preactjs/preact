import npm from 'rollup-plugin-npm';
import babel from 'rollup-plugin-babel';
import memory from 'rollup-plugin-memory';

export default {
	exports: 'named',
	useStrict: false,
	plugins: [
		memory({
			path: 'src/preact',
			contents: "export * from './preact';"
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
