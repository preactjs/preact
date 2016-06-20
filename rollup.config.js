import npm from 'rollup-plugin-node-resolve';
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
			externalHelpers: true,
			exclude: 'node_modules/**'
		})
	]
};
