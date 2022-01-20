import * as path from 'path';
import del from 'del';
import { writeFile, stat, mkdir } from 'fs/promises';
import { repoRoot, benchesRoot, toUrl } from './utils.js';
import { defaultBenchOptions } from './bench.js';
import { prepare } from './prepare.js';

const measureName = 'duration'; // Must match measureName in '../src/util.js'
const warnings = new Set([]);
const TACH_SCHEMA =
	'https://raw.githubusercontent.com/Polymer/tachometer/master/config.schema.json';

export const baseTraceLogDir = (...args) =>
	path.join(benchesRoot('logs'), ...args);

/**
 * @param {ConfigFileBenchmark["packageVersions"]["dependencies"]["framework"]} framework
 * @returns {Promise<boolean>}
 */
async function validateFileDep(framework) {
	try {
		if (typeof framework === 'string') {
			await stat(framework.replace(/^file:/, ''));
			return true;
		}
		return false;
	} catch (e) {
		console.log('Stat error:', e);
		return false;
	}
}

/**
 * @typedef {ConfigFileBenchmark["packageVersions"]} ConfigFilePackageVersion
 * @typedef {ConfigFilePackageVersion & { isValid(): Promise<boolean>; }} BenchConfig
 * @type {BenchConfig[]}
 */
export const frameworks = [
	{
		label: 'preact-v8',
		dependencies: {
			framework: 'file:' + repoRoot('benches/proxy-packages/preact-v8-proxy')
		},
		isValid() {
			return validateFileDep(this.dependencies.framework);
		}
	},
	{
		label: 'preact-master',
		dependencies: {
			framework:
				'file:' + repoRoot('benches/proxy-packages/preact-master-proxy')
		},
		async isValid() {
			try {
				await stat(repoRoot('preact.tgz'));
				return validateFileDep(this.dependencies.framework);
			} catch (e) {
				return false;
			}
		}
	},
	{
		label: 'preact-local',
		dependencies: {
			framework: 'file:' + repoRoot('benches/proxy-packages/preact-local-proxy')
		},
		isValid() {
			return validateFileDep(this.dependencies.framework);
		}
	}
];

/**
 * @param {string} benchPath
 * @param {TachometerOptions} options
 * @returns {Pick<ConfigFileBenchmark, "name" | "url" | "measurement">}
 */
function getBaseBenchmarkConfig(benchPath, options) {
	let name = path.basename(benchPath).replace('.html', '');
	let url = path.posix.relative(toUrl(benchesRoot()), toUrl(benchPath));

	/** @type {ConfigFileBenchmark["measurement"]} */
	let measurement;
	if (name == '02_replace1k') {
		// MUST BE KEPT IN SYNC WITH WARMUP COUNT IN 02_replace1k.html
		const WARMUP_COUNT = 3;

		// For 02_replace1k, collect additional measurements focusing on the JS
		// clock time for each warmup and the final duration.
		measurement = [
			{
				name: 'duration',
				mode: 'performance',
				entryName: measureName
			},
			{
				name: 'usedJSHeapSize',
				mode: 'expression',
				expression: 'window.usedJSHeapSize'
			}
		];
		if (options.memory === false) {
			measurement.pop();
		}

		for (let i = 0; i < WARMUP_COUNT; i++) {
			const entryName = `run-warmup-${i}`;
			measurement.push({
				name: entryName,
				mode: 'performance',
				entryName
			});
		}

		measurement.push({
			name: 'run-final',
			mode: 'performance',
			entryName: 'run-final'
		});
	} else {
		// Default measurements
		measurement = [
			{
				name: 'duration',
				mode: 'performance',
				entryName: measureName
			},
			{
				name: 'usedJSHeapSize',
				mode: 'expression',
				expression: 'window.usedJSHeapSize'
			}
		];
		if (options.memory === false) {
			measurement.pop();
		}
	}

	return { name, url, measurement };
}

export async function generateSingleConfig(benchFile, opts) {
	const benchPath = await benchesRoot('src', benchFile);
	const results = await stat(benchPath);
	if (!results.isFile) {
		throw new Error(`Given path is not a file: ${benchPath}`);
	}

	await generateConfig(benchPath, { ...defaultBenchOptions, ...opts });
}

/**
 * @typedef {import('tachometer/lib/configfile').ConfigFile} ConfigFile Expected
 * format of a top-level tachometer JSON config file.
 * @typedef {ConfigFile["benchmarks"][0]} ConfigFileBenchmark
 * @typedef {{ name: string; configPath: string; config: ConfigFile; }} ConfigData
 * @param {string} benchPath
 * @param {TachometerOptions & { prepare?: boolean }} options
 * @returns {Promise<ConfigData>}
 */
export async function generateConfig(benchPath, options) {
	/** @type {ConfigFileBenchmark["expand"]} */
	let expand;
	/** @type {BrowserConfigs} */
	let browser;

	const baseBenchConfig = getBaseBenchmarkConfig(benchPath, options);

	// See https://www.npmjs.com/package/tachometer#browsers
	// and https://www.npmjs.com/package/tachometer#config-file
	if (Array.isArray(options.browser)) {
		expand = options.browser.map(browserOpt => ({
			browser: parseBrowserOption(browserOpt, options)
		}));
	} else {
		browser = parseBrowserOption(options.browser, options);
	}

	if (browser.name == 'chrome' && options.trace) {
		const traceLogDir = baseTraceLogDir(baseBenchConfig.name);
		await del('**/*', { cwd: traceLogDir });
		await mkdir(traceLogDir, { recursive: true });

		browser.trace = {
			logDir: traceLogDir
		};
	}

	/** @type {BenchConfig[]} */
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
		if (typeof frameworkPath !== 'string') {
			throw new Error(
				'Only string/npm dependencies are supported at this time'
			);
		}

		if (!(await framework.isValid())) {
			const warnMsg = `Could not locate path for ${framework.label}: ${framework.dependencies.framework}. \nSkipping...`;
			if (!warnings.has(warnMsg)) {
				console.warn(warnMsg);
				warnings.add(warnMsg);
			}

			continue;
		}

		benchmarks.push({
			...baseBenchConfig,
			packageVersions: framework,
			browser,
			expand
		});
	}

	if (options.prepare !== false) {
		await prepare(benchmarks.map(b => b.packageVersions.label));
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

	const configPath = await writeConfig(baseBenchConfig.name, config);

	return { name: baseBenchConfig.name, configPath, config };
}

async function writeConfig(name, config) {
	const configPath = benchesRoot('dist', name + '.config.json');
	await mkdir(path.dirname(configPath), { recursive: true });
	await writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

	return configPath;
}

/**
 * @typedef {Exclude<ConfigFileBenchmark["browser"], string>} BrowserConfigs
 * @param {string} str
 * @param {TachometerOptions} options
 * @returns {BrowserConfigs}
 */
function parseBrowserOption(str, options) {
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
	const config = { name };

	if (config.name === 'chrome' || config.name === 'firefox') {
		config.headless = headless;
	}

	if (remoteUrl !== undefined) {
		config.remoteUrl = remoteUrl;
	}

	// Custom browser options
	if (config.name == 'chrome') {
		const mem = options.memory !== false;
		config.addArguments = [
			// Quoted values don't seem to work with WebDriver :(
			// `--js-flags="${mem ? '--expose-gc ' : ''}--random-seed=1157259157"`,
			mem && '--js-flags=--expose-gc',
			mem && '--enable-precise-memory-info',
			'--disable-ipc-flooding-protection',
			'--disable-renderer-backgrounding',
			'--disable-background-timer-throttling',
			'--disable-backgrounding-occluded-windows',
			'--disable-hang-monitor',
			'--disable-device-discovery-notifications',
			'--disable-extensions',
			'--incognito',
			'--no-sandbox'
		].filter(Boolean);
	}

	return config;
}
