import * as path from 'path';
import { writeFile, stat, mkdir } from 'fs/promises';
import { repoRoot, benchesRoot, toUrl } from './utils.js';
import { defaultBenchOptions } from './bench.js';

const measureName = 'duration'; // Must match measureName in '../src/util.js'
const warnings = new Set([]);
const TACH_SCHEMA =
	'https://raw.githubusercontent.com/Polymer/tachometer/master/config.schema.json';

/**
 * @typedef {ConfigFile["benchmarks"][0]["packageVersions"]} ConfigFilePackageVersion
 * @type {ConfigFilePackageVersion[]}
 */
const frameworks = [
	{
		label: 'preact-v8',
		dependencies: {
			framework: 'file:' + repoRoot('benches/proxy-packages/preact-v8-proxy')
		}
	},
	{
		label: 'preact-master',
		dependencies: {
			framework: 'file:' + repoRoot('preact.tgz')
		}
	},
	{
		label: 'preact-local',
		dependencies: {
			framework: 'file:' + repoRoot()
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
 * @typedef {import('tachometer/lib/configfile').ConfigFile} ConfigFile Expected
 * format of a top-level tachometer JSON config file.
 * @typedef {{ name: string; configPath: string; config: ConfigFile; }} ConfigData
 * @param {string} benchPath
 * @param {TachometerOptions} options
 * @returns {Promise<ConfigData>}
 */
export async function generateConfig(benchPath, options) {
	const name = path.basename(benchPath).replace('.html', '');
	const url = path.posix.relative(toUrl(benchesRoot()), toUrl(benchPath));

	/** @type {ConfigFile["benchmarks"][0]["expand"]} */
	let expand;
	/** @type {BrowserConfigs} */
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
		frameworksToRun = frameworks;
	} else if (typeof options.framework === 'string') {
		const match = frameworks.find(f => f.label == options.framework);
		frameworksToRun = match ? [match] : [];
	} else if (Array.isArray(options.framework)) {
		frameworksToRun = frameworks.filter(f =>
			options.framework.includes(f.label)
		);
	} else {
		throw new Error(`Unrecognized framework option: ${options.framework}`);
	}

	if (frameworksToRun.length == 0) {
		console.error(
			`Framework options did not match any configured frameworks:\n` +
				`\tProvided option: ${options.framework}\n` +
				`\tAvailable frameworks: [${frameworks
					.map(f => JSON.stringify(f.label))
					.join(', ')}]\n`
		);

		throw new Error(
			`Framework option did not match any configured frameworks: ${options.framework}`
		);
	}

	/** @type {ConfigFile["benchmarks"]} */
	const benchmarks = [];
	for (let framework of frameworksToRun) {
		let frameworkPath = framework.dependencies.framework;
		if (typeof frameworkPath == 'string' && frameworkPath.startsWith('file:')) {
			frameworkPath = frameworkPath.replace(/^file:/, '');
			try {
				await stat(frameworkPath);
			} catch (e) {
				const warnMsg = `Could not locate path for ${framework.label}: ${framework.dependencies.framework}. \nSkipping...`;
				if (!warnings.has(warnMsg)) {
					console.warn(warnMsg);
					warnings.add(warnMsg);
				}

				continue;
			}
		}

		benchmarks.push({
			name,
			url,
			packageVersions: framework,
			measurement: [
				{
					mode: 'performance',
					entryName: measureName
				},
				{
					mode: 'expression',
					expression: 'window.usedJSHeapSize'
				}
			],
			browser,
			expand
		});
	}

	/** @type {ConfigFile} */
	const config = {
		$schema: TACH_SCHEMA,
		sampleSize: options['sample-size'],
		timeout: options.timeout,
		horizons: options.horizon.split(','),
		benchmarks
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
 * @typedef {Exclude<ConfigFile["benchmarks"][0]["browser"], string>} BrowserConfigs
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

	/** @type {import('tachometer/lib/browser').BrowserName} */
	// @ts-ignore
	const name = str;

	/** @type {BrowserConfigs} */
	const config = { name, headless };
	if (remoteUrl !== undefined) {
		config.remoteUrl = remoteUrl;
	}

	// Custom browser options
	if (config.name == 'chrome') {
		config.addArguments = [
			'--js-flags=--expose-gc',
			'--enable-precise-memory-info'
		];
	}

	return config;
}
