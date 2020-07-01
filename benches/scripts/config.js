import * as path from 'path';
import { writeFile, stat, mkdir } from 'fs/promises';
import { repoRoot, benchesRoot, toUrl, IS_CI } from './utils.js';
import { defaultBenchOptions } from './bench.js';

const TACH_SCHEMA =
	'https://raw.githubusercontent.com/Polymer/tachometer/master/config.schema.json';

/** @type {ConfigFilePackageVersion[]} */
const frameworks = [
	{
		label: 'preact-v8',
		dependencies: {
			preact: '^8.5.3'
		}
	},
	{
		label: 'preact-master',
		dependencies: {
			preact: 'github:preactjs/preact#master'
		}
	},
	{
		label: 'preact-local',
		dependencies: {
			preact: 'file:' + repoRoot()
		}
	}
];

export async function generateSingleConfig(benchFile) {
	const benchPath = await benchesRoot('src', benchFile);
	const results = await stat(benchPath);
	if (!results.isFile) {
		throw new Error(`Given path is not a file: ${benchPath}`);
	}

	await generateConfig(benchPath, defaultBenchOptions);
}

/**
 * @typedef {{ name: string; configPath: string; config: ConfigFile; }} ConfigData
 * @param {string} benchPath
 * @param {TachometerOptions} options
 * @returns {Promise<ConfigData>}
 */
export async function generateConfig(benchPath, options) {
	const name = path.basename(benchPath).replace('.html', '');
	const url = path.posix.relative(toUrl(benchesRoot()), toUrl(benchPath));

	let expand;
	let browser;
	// See https://www.npmjs.com/package/tachometer#browsers
	// and https://www.npmjs.com/package/tachometer#config-file
	if (Array.isArray(options.browser)) {
		expand = options.browser.map(browserOpt => ({
			browser: parseBrowserOption(browserOpt)
		}));
	} else {
		browser = parseBrowserOption(options.browser);
	}

	/** @type {Array<ConfigFilePackageVersion>} */
	let frameworksToRun;
	if (!options.framework) {
		// By default, only run preact-v8 locally so CI benches run faster
		frameworksToRun = frameworks.filter(f => !IS_CI || f.label !== 'preact-v8');
	} else if (typeof options.framework === 'string') {
		frameworksToRun = [frameworks.find(f => f.label == options.framework)];
	} else if (Array.isArray(options.framework)) {
		frameworksToRun = frameworks.filter(f =>
			options.framework.includes(f.label)
		);
	} else {
		throw new Error(`Unrecognized framework option: ${options.framework}`);
	}

	/** @type {ConfigFile} */
	const config = {
		$schema: TACH_SCHEMA,
		sampleSize: options['sample-size'],
		timeout: options.timeout,
		horizons: options.horizon.split(','),
		benchmarks: frameworksToRun.map(packageVersions => ({
			name,
			url,
			packageVersions,
			browser,
			expand
		}))
	};

	if (config.benchmarks.length == 0) {
		if (options.framework) {
			const configuredFrameworks = frameworks.map(f => f.label).join(', ');
			throw new Error(
				`No benchmarks created. Does the specified framework match one of the configured frameworks? ${configuredFrameworks}`
			);
		} else {
			throw new Error(
				`Unknown failure: no benchmarks created. frameworksToRun: ${frameworksToRun}`
			);
		}
	}

	const configPath = await writeConfig(name, config);

	return { name, configPath, config };
}

async function writeConfig(name, config) {
	const configPath = benchesRoot('dist', name + '.config.json');
	await mkdir(path.dirname(configPath), { recursive: true });
	await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

	return configPath;
}

/**
 * @param {string} str
 * @returns {BrowserConfigs}
 */
function parseBrowserOption(str) {
	// Source: https://github.com/Polymer/tachometer/blob/d4d5116acb2d7df18035ddc36f0a3a1730841a23/src/browser.ts#L100
	let remoteUrl;
	const at = str.indexOf('@');
	if (at !== -1) {
		remoteUrl = str.substring(at + 1);
		str = str.substring(0, at);
	}
	const headless = str.endsWith('-headless');
	if (headless === true) {
		str = str.replace(/-headless$/, '');
	}

	/** @type {BrowserName} */
	// @ts-ignore
	const name = str;
	const config = { name, headless };
	if (remoteUrl !== undefined) {
		config.remoteUrl = remoteUrl;
	}
	return config;
}
