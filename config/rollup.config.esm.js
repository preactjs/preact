import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
	useStrict: true,
	format: 'es',
	entry: 'src/preact.js',
	plugins: [
		nodeResolve({
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
