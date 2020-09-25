import * as path from 'path';
import { mkdir } from 'fs/promises';
import { spawn } from 'child_process';
import { Transform } from 'stream';
import escapeRe from 'escape-string-regexp';
import stripAnsi from 'strip-ansi';
import { pool } from '@kristoferbaxter/async';
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
	open: IS_CI ? false : true
};

const getResultDir = (benchmark, framework) =>
	resultsPath('v8-deopt-viewer', benchmark, framework);

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
	return new Promise(async (resolve, reject) => {
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

function createPrefixTransform(prefix) {
	return new Transform({
		transform(chunk, encoding, callback) {
			try {
				// @ts-ignore
				chunk = encoding == 'buffer' ? chunk.toString() : chunk;
				const lines = chunk.split('\n');

				for (let line of lines) {
					if (line) {
						line = `[${prefix}] ${line}`;
						this.push(line + '\n');
					}
				}

				callback();
			} catch (error) {
				return callback(error);
			}
		}
	});
}

/**
 * @param {TachURL} tachURL
 * @param {DeoptOptions} options
 */
async function runV8DeoptViewer(tachURL, options) {
	const deoptOutputDir = getResultDir(tachURL.benchName, tachURL.framework);
	await mkdir(deoptOutputDir, { recursive: true });

	const deoptArgs = [
		tachURL.url,
		'-o',
		deoptOutputDir,
		'-t',
		(options.timeout * 1000).toString()
	];

	if (options.open) {
		deoptArgs.push('--open');
	}

	const deoptProcess = await runPackage('v8-deopt-viewer', deoptArgs);
	deoptProcess.stdout
		.pipe(createPrefixTransform(tachURL.framework))
		.pipe(process.stdout);
	deoptProcess.stderr
		.pipe(createPrefixTransform(tachURL.framework))
		.pipe(process.stderr);

	await onExit(deoptProcess);
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

		// Run v8-deopt-viewer against tachometer URL
		console.log();
		await pool(tachURLs, tachURL =>
			runV8DeoptViewer(tachURL, {
				...options,
				open: options.open && tachURLs.length == 1
			})
		);

		if (tachURLs.length > 1) {
			const rootResultDir = getResultDir('', '');
			console.log(`\nOpen your browser to ${rootResultDir} to view results.`);

			if (options.open) {
				// TODO: Figure out how to open a directory in the user's default browser
			}
		}
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
