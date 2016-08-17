import memory from 'rollup-plugin-memory';
import rollupConfig from './rollup.config';

export default Object.assign({}, rollupConfig, {
	plugins: [
		memory({
			path: 'src/preact',
			contents: `import { h } from './preact';export * from './preact';export { h as createElement };`
		}),
		...rollupConfig.plugins.slice(1)
	]
});
