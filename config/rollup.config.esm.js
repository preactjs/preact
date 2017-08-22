import config from './rollup.config';

// ES output
config.format = 'es';

// remove memory() plugin
config.plugins.splice(0, 1);

export default config;
