const { spawnSync } = require('child_process');
const { mkdir } = require('fs').promises;
const { globSrc, benchesRoot, allBenches, resultsPath } = require('./paths');
const { generateConfig } = require('./config');

/**
 * @param {string} bench1
 * @param {{ _: string[]; } & import('./config').TachometerOptions} opts
 */
async function runBenches(bench1 = 'all', opts) {
	const globs = bench1 === 'all' ? allBenches : [bench1].concat(opts._);
	const benchesToRun = await globSrc(globs);
	const configFileTasks = benchesToRun.map(async benchPath => {
		return generateConfig(benchesRoot('src', benchPath), opts);
	});

	await mkdir(resultsPath(), { recursive: true });

	const configFiles = await Promise.all(configFileTasks);
	for (const { name, configPath } of configFiles) {
		const args = [
			benchesRoot('node_modules/tachometer/bin/tach.js'),
			'--config',
			configPath,
			'--csv-file',
			benchesRoot('results', name + '.csv'),
			'--json-file',
			benchesRoot('results', name + '.json')
		];

		console.log('$', process.execPath, ...args);

		spawnSync(process.execPath, args, {
			cwd: benchesRoot(),
			stdio: 'inherit'
		});
	}
}

module.exports = {
	runBenches
};
