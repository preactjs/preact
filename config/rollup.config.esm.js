import config from './rollup.config';

// ES output
config.output.format = 'es';
config.output.file = 'dist/preact.esm.js';

// remove memory() plugin
config.plugins.splice(0, 1);

export default config;
