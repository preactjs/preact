/* eslint-disable no-console */

import { mkdir } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import escapeRe from 'escape-string-regexp';
import puppeteer from 'puppeteer';
import stripAnsi from 'strip-ansi';
import {
	globSrc,
	benchesRoot,
	getPkgBinPath,
	resultsPath,
	IS_CI
} from './utils.js';
import { generateConfig } from './config.js';
import { defaultBenchOptions } from './bench.js';

export const defaultDeoptsOptions = {
	framework: 'preact-local',
	timeout: 5,
	open: !IS_CI
};

const getLogFilePath = (benchmark, framework) =>
	resultsPath('deopts', `${benchmark}-${framework}-v8.log`);

/**
 * @param {string} pkgName
 * @param {string[]} args
 * @param {"pipe" | "inherit"} [stdio]
 * @returns {Promise<import('child_process').ChildProcess>}
 */
async function runPackage(pkgName, args, stdio) {
	const binPath = await getPkgBinPath(pkgName);
	args.unshift(binPath);

	return spawn(process.execPath, args, { stdio });
}

/**
 * @param {import('child_process').ChildProcess} childProcess
 */
async function onExit(childProcess) {
	return new Promise((resolve, reject) => {
		childProcess.once('exit', (code, signal) => {
			if (code === 0 || signal == 'SIGINT') {
				resolve();
			} else {
				reject(new Error('Exit with error code: ' + code));
			}
		});

		childProcess.once('error', err => {
			reject(err);
		});
	});
}

/**
 * @typedef {{ benchName: string; framework: string; url: string; }} TachURL
 * @param {import('child_process').ChildProcess} tachProcess
 * @param {import('./config').ConfigData} tachConfig
 * @param {number} timeoutMs
 * @returns {Promise<TachURL[]>}
 */
async function getTachometerURLs(tachProcess, tachConfig, timeoutMs = 60e3) {
	return new Promise((resolve, reject) => {
		let timeout;
		if (timeoutMs > 0) {
			timeout = setTimeout(() => {
				reject(
					new Error(
						'Timed out waiting for Tachometer to get set up. Did it output a URL?'
					)
				);
			}, timeoutMs);
		}

		// Look for lines like:
		// many_updates [@preact]
		// http://127.0.0.1:56536/src/many_updates.html
		const benchesToSearch = tachConfig.config.benchmarks.map(bench => ({
			benchName: bench.name,
			framework: bench.packageVersions.label,
			regex: new RegExp(
				escapeRe(`${bench.name} [@${bench.packageVersions.label}]`) +
					`\\s+(http:\\/\\/.*)`,
				'im'
			),
			url: null
		}));

		/** @type {TachURL[]} */
		const results = [];
		let output = '';
		tachProcess.stdout.on('data', function onStdOutChunk(chunk) {
			output += stripAnsi(chunk.toString('utf8'));

			for (let bench of benchesToSearch) {
				if (bench.url) {
					continue;
				}

				let match = output.match(bench.regex);
				if (match) {
					bench.url = match[1];
					results.push(bench);
				}
			}

			if (results.length == benchesToSearch.length) {
				// All URLs found, removeEventListener
				tachProcess.off('data', onStdOutChunk);

				clearTimeout(timeout);
				resolve(results);
			}
		});
	});
}

/** @type {(ms: number) => Promise<void>} */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @param {TachURL} tachURL
 * @param {DeoptOptions} options
 */
async function runPuppeteer(tachURL, options) {
	const logFilePath = getLogFilePath(tachURL.benchName, tachURL.framework);
	await mkdir(path.dirname(logFilePath), { recursive: true });

	const browser = await puppeteer.launch({
		headless: false,
		ignoreDefaultArgs: ['about:blank'],
		args: [
			'--disable-extensions',
			'--no-sandbox',
			'--js-flags=' +
				[
					'--prof',
					'--log-deopt',
					'--log-ic',
					'--log-maps',
					'--log-map-details',
					'--log-internal-timer-events',
					'--log-code',
					'--log-source-code',
					'--detailed-line-info',
					'--no-logfile-per-isolate',
					`--logfile=${logFilePath}`
				].join(','),
			tachURL.url
		]
	});

	await browser.pages();

	console.log(`Loading ${tachURL.url} in puppeteer...`);
	await delay(1000);
	await browser.close();

	console.log('Waiting for browser to exit...');
	await delay(1000);
}

/**
 * @param {string} benchGlob
 * @param {DeoptOptions} options
 */
export async function runDeopts(benchGlob, options) {
	// TODO:
	// * Handle multiple benchmarks

	const frameworks = options.framework;
	if (!benchGlob) {
		benchGlob = 'many_updates.html';
	}

	const benchesToRun = await globSrc(benchGlob);
	if (benchesToRun.length > 1) {
		console.error('Matched multiple benchmarks. Only running the first one.');
	}

	const benchPath = benchesRoot('src', benchesToRun[0]);
	const tachConfig = await generateConfig(benchPath, {
		...defaultBenchOptions,
		...defaultDeoptsOptions,
		framework: frameworks
	});

	console.log('Benchmarks running:', benchPath);
	console.log('Frameworks running:', frameworks);

	/** @type {Promise<void>} */
	let onTachExit;
	/** @type {import('child_process').ChildProcess} */
	let tachProcess;
	try {
		// Run tachometer in manual mode with generated config
		const tachArgs = ['--config', tachConfig.configPath, '--manual'];
		tachProcess = await runPackage('tachometer', tachArgs);
		tachProcess.stdout.pipe(process.stdout);
		tachProcess.stderr.pipe(process.stderr);
		onTachExit = onExit(tachProcess);

		// Parse URL from tachometer stdout
		const tachURLs = await getTachometerURLs(tachProcess, tachConfig);

		// Run puppeteer for each tachometer URL
		console.log();
		for (let tachURL of tachURLs) {
			await runPuppeteer(tachURL, options);
		}

		console.log(
			`\nOpen the following files in VSCode's DeoptExplorer extension to view results:`
		);
		console.log(
			tachURLs
				.map(tachURL => getLogFilePath(tachURL.benchName, tachURL.framework))
				.map(logFilePath => path.relative(benchesRoot(), logFilePath))
		);
	} finally {
		if (tachProcess) {
			tachProcess.kill('SIGINT');

			// Log a message is Tachometer takes a while to close
			let logMsg = () => console.log('Waiting for Tachometer to exit...');
			let t = setTimeout(logMsg, 2e3);

			try {
				await onTachExit;
			} catch (error) {
				console.error('Error waiting for Tachometer to exit:', error);
			} finally {
				clearTimeout(t);
			}
		}
	}
}
