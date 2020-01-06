import { spawnSync } from 'child_process';
import { mkdir } from 'fs/promises';
import {
	globSrc,
	benchesRoot,
	allBenches,
	resultsPath,
	IS_CI
} from './utils.js';
import { generateConfig } from './config.js';

export const defaultBenchOptions = {
	browser: 'chrome-headless',
	// Tachometer default is 50, but locally let's only do 10
	'sample-size': !IS_CI ? 10 : 50,
	// Tachometer default is 10% but let's do 5% to save some GitHub action
	// minutes by reducing the likelihood of needing auto-sampling. See
	// https://github.com/Polymer/tachometer#auto-sampling
	horizon: '5%',
	// Tachometer default is 3 minutes, but let's shrink it to 1 here to save some
	// GitHub Action minutes
	timeout: 1,
	'window-size': '1024,768',
	framework: IS_CI ? ['preact-master', 'preact-local'] : null
};

/**
 * @param {string} bench1
 * @param {{ _: string[]; } & TachometerOptions} opts
 */
export async function runBenches(bench1 = 'all', opts) {
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
			'--json-file',
			benchesRoot('results', name + '.json')
		];

		console.log('\n$', process.execPath, ...args);

		spawnSync(process.execPath, args, {
			cwd: benchesRoot(),
			stdio: 'inherit'
		});
	}
}
