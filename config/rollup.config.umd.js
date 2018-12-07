import config from './rollup.config';

// UMD output
config.output.format = 'umd';
config.output.file = 'dist/preact.umd.js';

// remove memory() plugin
config.plugins.splice(0, 1);

export default config;
