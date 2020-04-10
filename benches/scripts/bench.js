const path = require('path');
const { spawnSync } = require('child_process');
const { writeFile, mkdir } = require('fs').promises;
const { globSrc, benchesRoot, allBenches } = require('./paths');
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

		return configPath;
	});

	const configFiles = await Promise.all(configFileTasks);
	for (const configFile of configFiles) {
		spawnSync(
			'node',
			[
				benchesRoot('node_modules/tachometer/bin/tach.js'),
				'--config',
				configFile,
				'--force-clean-npm-install'
			],
			{
				cwd: benchesRoot(),
				stdio: 'inherit'
			}
		);
	}
}

module.exports = {
	runBenches
};
