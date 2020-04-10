const path = require('path');
const { writeFile } = require('fs').promises;
const { globSrc, benchesRoot, toUrl, allBenches } = require('./paths');

const TACH_SCHEMA =
	'https://raw.githubusercontent.com/Polymer/tachometer/master/config.schema.json';

const getBenchName = benchPath => path.basename(benchPath).replace('.html', '');

async function generateDefaultConfig() {
	const benches = await globSrc(allBenches);
	const benchConfigs = await Promise.all(benches.map(b => generateConfig(b)));
	const expand = benchConfigs.map(config => ({
		name: config.benchmarks[0].name,
		url: config.benchmarks[0].url
	}));

	const config = {
		$schema: TACH_SCHEMA,
		benchmarks: [
			{
				packageVersions: {
					label: 'preact8',
					dependencies: {
						preact: '^8.5.3'
					}
				},
				expand
			},
			{
				packageVersions: {
					label: 'preact10',
					dependencies: {
						preact: '^10.4.0'
					}
				},
				expand
			}
		]
	};

	await writeFile(
		benchesRoot('tach.config.json'),
		JSON.stringify(config, null, 2),
		'utf8'
	);
}

/**
 * @typedef {{ browser: string; "window-size": string; "sample-size": number; horizon: string; timeout: number; }} TachometerOptions
 * @param {string} bench
 * @param {TachometerOptions} [options]
 */
async function generateConfig(bench, options) {
	const name = getBenchName(bench);
	const url = path.posix.relative(
		toUrl(benchesRoot()),
		toUrl(benchesRoot('src', bench))
	);

	const config = {
		$schema: TACH_SCHEMA,
		sampleSize: options['sample-size'],
		timeout: options.timeout,
		horizons: options.horizon.split(','),
		benchmarks: [
			{
				name,
				url,
				packageVersions: {
					label: 'preact8',
					dependencies: {
						preact: '^8.5.3'
					}
				}
			},
			{
				name,
				url,
				packageVersions: {
					label: 'preact10',
					dependencies: {
						preact: '^10.4.0'
					}
				}
			}
		]
	};

	return config;
}

module.exports = {
	getBenchName,
	generateDefaultConfig,
	generateConfig
};
