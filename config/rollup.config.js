import fs from 'fs';
import memory from 'rollup-plugin-memory';
import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

let pkg = JSON.parse(fs.readFileSync('./package.json'));

let external = Object.keys(pkg.peerDependencies || {}).concat(Object.keys(pkg.dependencies || {}));

let format = process.env.FORMAT === 'es' ? 'es' : 'iife';

export default {
	entry: 'src/preact.js',
	sourceMap: true,
	exports: format==='es' ? null : 'default',
	dest: format==='es' ? pkg.module : pkg.main,
	format,
	external,
	useStrict: true,
	plugins: [
		format==='iife' && memory({
            path: 'src/preact.js',
			contents: `
				import preact from './preact';
				if (typeof module!='undefined') module.exports = preact;
				else self.preact = preact;
			`
		}),
		buble({
			objectAssign: 'extend',
			namedFunctionExpressions: false
		}),
		nodeResolve({
			jsnext: true,
			main: true,
			skip: external
		}),
		commonjs({
			include: 'node_modules/**',
			exclude: '**/*.css'
		})
	].filter(Boolean)
};
