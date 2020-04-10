const path = require('path');
const { writeFile, stat, mkdir } = require('fs').promises;
const { repoRoot, benchesRoot, toUrl } = require('./paths');

const TACH_SCHEMA =
	'https://raw.githubusercontent.com/Polymer/tachometer/master/config.schema.json';

async function generateSingleConfig(benchFile) {
	const benchPath = await benchesRoot('src', benchFile);
	const results = await stat(benchPath);
	if (!results.isFile) {
		throw new Error(`Given path is not a file: ${benchPath}`);
	}

	await generateConfig(benchPath);
}

/**
 * @typedef {{ browser: string; "window-size": string; "sample-size": number; horizon: string; timeout: number; }} TachometerOptions
 * @param {string} benchPath
 * @param {TachometerOptions} [options]
 */
async function generateConfig(benchPath, options) {
	const name = path.basename(benchPath).replace('.html', '');
	const url = path.posix.relative(toUrl(benchesRoot()), toUrl(benchPath));

	const config = { $schema: TACH_SCHEMA };

	if (options) {
		config.sampleSize = options['sample-size'];
		config.timeout = options.timeout;
		config.horizons = options.horizon.split(',');
	}

	config.benchmarks = [
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
		},
		{
			name,
			url,
			packageVersions: {
				label: 'preactLocal',
				dependencies: {
					preact: 'file:' + repoRoot()
				}
			}
		}
	];

	const configPath = await writeConfig(name, config);

	return { name, configPath };
}

async function writeConfig(name, config) {
	const configPath = benchesRoot('dist', name + '.config.json');
	await mkdir(path.dirname(configPath), { recursive: true });
	await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

	return configPath;
}

module.exports = {
	generateSingleConfig,
	generateConfig
};
