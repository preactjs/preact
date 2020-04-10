const path = require('path');
const { spawnSync } = require('child_process');
const { writeFile, mkdir } = require('fs').promises;
const { globSrc, benchesRoot, allBenches, resultsPath } = require('./paths');
const { generateConfig, getBenchName } = require('./config');

/**
 * @param {string} bench1
 * @param {{ _: string[]; } & import('./config').TachometerOptions} opts
 */
async function runBenches(bench1, opts) {
	const globs = bench1 === 'all' ? allBenches : [bench1].concat(opts._);
	const benchesToRun = await globSrc(globs);
	const configFileTasks = benchesToRun.map(async bench => {
		const name = getBenchName(bench);
		const config = await generateConfig(bench, opts);

		const configPath = benchesRoot('dist', name + '.config.json');
		await mkdir(path.dirname(configPath), { recursive: true });
		await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

		return { name, configPath };
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
