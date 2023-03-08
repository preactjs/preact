import { existsSync } from 'fs';
import { readFile, readdir } from 'fs/promises';
import prompts from 'prompts';
import { baseTraceLogDir, frameworks } from './config.js';

import { summaryStats, computeDifferences } from 'tachometer/lib/stats.js';
import {
	automaticResultTable,
	verticalTermResultTable
} from 'tachometer/lib/format.js';

/**
 * @typedef {import('./tracing').TraceEvent} TraceEvent
 * @typedef {import('tachometer/lib/stats').SummaryStats} SummaryStats
 * @typedef {import('tachometer/lib/stats').ResultStats} ResultStats
 * @typedef {import('tachometer/lib/stats').ResultStatsWithDifferences} ResultStatsWithDifferences
 */

const toTrack = new Set([
	// 'V8.CompileCode', // Might be tachometer code?? But maybe not?
	'V8.MarkCandidatesForOptimization',
	'V8.OptimizeCode',
	'V8.OptimizeConcurrentPrepare',
	'V8.OptimizeNonConcurrent',
	// 'V8.OptimizeBackground', // Runs on background thread
	'V8.InstallOptimizedFunctions',
	'V8.DeoptimizeCode',
	'MinorGC',
	'V8.GCDeoptMarkedAllocationSites'
]);

/**
 * @template T
 * @param {Map<string, T[]>} grouping
 * @param {Map<string, T | T[]>} results
 */
function addToGrouping(grouping, results) {
	for (let [group, data] of results.entries()) {
		if (grouping.has(group)) {
			if (Array.isArray(data)) {
				grouping.get(group).push(...data);
			} else {
				grouping.get(group).push(data);
			}
		} else if (Array.isArray(data)) {
			grouping.set(group, data);
		} else {
			grouping.set(group, [data]);
		}
	}
}

/**
 * @template K
 * @template V
 * @param {Map<K, V[]>} map
 * @param {K} key
 * @param  {...V} values
 */
function addToMapArray(map, key, ...values) {
	if (map.has(key)) {
		map.get(key).push(...values);
	} else {
		map.set(key, values);
	}
}

/**
 * @template K
 * @template V
 * @param {Map<K, V[]>} map
 * @param {K} key
 * @param {number} index
 * @param {V} value
 */
function setInMapArray(map, key, index, value) {
	if (map.has(key)) {
		map.get(key)[index] = value;
	} else {
		map.set(key, [value]);
	}
}

/**
 * @param {ResultStats[]} results
 */
function logDifferences(key, results) {
	let withDifferences = computeDifferences(results);
	console.log();
	let { fixed, unfixed } = automaticResultTable(withDifferences);
	// console.log(horizontalTermResultTable(fixed));
	console.log(key);
	console.log(verticalTermResultTable(unfixed));
}

/**
 * @param {string} version
 * @param {string[]} logPaths
 * @param {(logs: TraceEvent[], logFilePath: string) => number} [getThreadId]
 * @param {(log: TraceEvent) => boolean} [trackEventsIn]
 * @returns {Promise<Map<string, ResultStats>>}
 */
async function getStatsFromLogs(version, logPaths, getThreadId, trackEventsIn) {
	/** @type {Map<string, number[]>} Sums for each function for each file */
	const data = new Map();
	for (let logPath of logPaths) {
		/** @type {TraceEvent[]} */
		const logs = JSON.parse(await readFile(logPath, 'utf8'));

		let tid = getThreadId ? getThreadId(logs, logPath) : null;

		/** @type {Array<{ id: string; start: number; end: number; }>} Determine what durations to track events under */
		const parentLogs = [];
		for (let log of logs) {
			if (trackEventsIn && trackEventsIn(log)) {
				if (log.ph == 'X') {
					parentLogs.push({
						id: log.name,
						start: log.ts,
						end: log.ts + log.dur
					});
				} else if (log.ph == 'b') {
					parentLogs.push({
						id: log.name,
						start: log.ts,
						end: log.ts
					});
				} else if (log.ph == 'e') {
					parentLogs.find(l => l.id == log.name).end = log.ts;
				} else {
					throw new Error(`Unsupported parent log type: ${log.ph}`);
				}
			}
		}

		/** @type {Map<string, import('./tracing').AsyncEvent>} */
		const durationBeginEvents = new Map();

		/** @type {Map<string, number[]>} Sum of time spent in each function for this log file */
		const sumsForFile = new Map();
		for (let log of logs) {
			if (tid != null && log.tid !== tid) {
				// if (toTrack.has(log.name)) {
				// 	console.log(
				// 		`Skipping ${log.name} on tid ${log.tid} (expected ${tid}) in ${logPath}`
				// 	);
				// }

				continue;
			}

			if (log.ph == 'X') {
				// Track duration event
				if (toTrack.has(log.name)) {
					let key = `Sum of ${log.name} time`;
					let sum = sumsForFile.get(key)?.[0] ?? 0;
					// sumsForFile.set(log.name, sum + log.dur / 1000);
					setInMapArray(sumsForFile, key, 0, sum + log.dur / 1000);

					key = `Count of ${log.name}`;
					sum = sumsForFile.get(key)?.[0] ?? 0;
					// sumsForFile.set(key, sum + 1);
					setInMapArray(sumsForFile, key, 0, sum + 1);

					key = `Sum of V8 runtime`;
					sum = sumsForFile.get(key)?.[0] ?? 0;
					// sumsForFile.set(key, sum + log.dur / 1000);
					setInMapArray(sumsForFile, key, 0, sum + log.dur / 1000);

					for (let parentLog of parentLogs) {
						if (
							parentLog.start <= log.ts &&
							log.ts + log.dur <= parentLog.end
						) {
							key = `In ${parentLog.id}, Sum of V8 runtime`;
							sum = sumsForFile.get(key)?.[0] ?? 0;
							setInMapArray(sumsForFile, key, 0, sum + log.dur / 1000);
						}
					}
				}

				if (log.name == 'MinorGC' || log.name == 'MajorGC') {
					let key = `${log.name} usedHeapSizeBefore`;
					addToMapArray(sumsForFile, key, log.args.usedHeapSizeBefore / 1e6);

					key = `${log.name} usedHeapSizeAfter`;
					addToMapArray(sumsForFile, key, log.args.usedHeapSizeAfter / 1e6);
				}
			} else if (
				(log.ph == 'b' || log.ph == 'e') &&
				log.cat == 'blink.user_timing' &&
				log.scope == 'blink.user_timing'
			) {
				// TODO: Doesn't handle nested events of same name. Oh well.
				if (log.ph == 'b') {
					durationBeginEvents.set(log.name, log);
				} else {
					const beginEvent = durationBeginEvents.get(log.name);
					const endEvent = log;
					durationBeginEvents.delete(log.name);

					let key = beginEvent.name;
					let duration = (endEvent.ts - beginEvent.ts) / 1000;
					addToMapArray(sumsForFile, key, duration);

					if (key.startsWith('run-') && key !== 'run-warmup-0') {
						// Skip run-warmup-0 since it doesn't do unmounting
						addToMapArray(sumsForFile, 'average run duration', duration);
					}
				}
			}
		}

		addToGrouping(data, sumsForFile);
	}

	const stats = new Map();
	for (let [key, sums] of data) {
		stats.set(key, {
			result: {
				name: '02_replace1k',
				version,
				measurement: {
					name: key,
					mode: 'expression',
					expression: key,
					unit: key.startsWith('Count')
						? ''
						: key.includes('usedHeapSize')
						? 'MB'
						: null
				},
				browser: {
					name: 'chrome'
				},
				millis: sums
			},
			stats: summaryStats(sums)
		});
	}

	return stats;
}

/**
 * @param {import('./tracing').TraceEvent[]} logs
 * @param {string} logFilePath
 * @returns {number}
 */
function getDurationThread(logs, logFilePath) {
	let log = logs.find(isDurationLog);

	if (log == null) {
		throw new Error(
			`Could not find blink.user_timing log for "run-final" or "duration" in ${logFilePath}.`
		);
	} else {
		return log.tid;
	}
}

/**
 * @param {TraceEvent} log
 */
function isDurationLog(log) {
	return (
		(log.ph == 'b' || log.ph == 'e') &&
		log.cat == 'blink.user_timing' &&
		log.scope == 'blink.user_timing' &&
		// Tachometer may kill the tab after seeing the duration measure before
		// the tab can log it to the trace file
		(log.name == 'run-final' || log.name == 'duration')
	);
}

export async function analyze() {
	// const frameworkNames = await readdir(p('logs'));
	const frameworkNames = frameworks.map(f => f.label);
	const listAtEnd = [
		'average run duration',
		'Sum of V8 runtime',
		'In run-final, Sum of V8 runtime',
		'In duration, Sum of V8 runtime',
		'duration'
	];

	if (!existsSync(baseTraceLogDir())) {
		console.log(
			`Could not find log directory: "${baseTraceLogDir()}". Did you run the benchmarks?`
		);
		return;
	}

	const benchmarkNames = await readdir(baseTraceLogDir());
	let selectedBench;
	if (benchmarkNames.length == 0) {
		console.log(`No benchmarks or results found in "${baseTraceLogDir()}".`);
		return;
	} else if (benchmarkNames.length == 1) {
		selectedBench = benchmarkNames[0];
	} else {
		selectedBench = (
			await prompts({
				type: 'select',
				name: 'value',
				message: "Which benchmark's results would you like to analyze?",
				choices: benchmarkNames.map(name => ({
					title: name,
					value: name
				}))
			})
		).value;
	}

	/** @type {Map<string, ResultStats[]>} */
	const resultStatsMap = new Map();
	for (let framework of frameworkNames) {
		const logDir = baseTraceLogDir(selectedBench, framework);

		let logFilePaths;
		try {
			logFilePaths = (await readdir(logDir)).map(fn =>
				baseTraceLogDir(selectedBench, framework, fn)
			);
		} catch (e) {
			// If directory doesn't exist or we fail to read it, just skip
			continue;
		}

		const resultStats = await getStatsFromLogs(
			framework,
			logFilePaths,
			getDurationThread,
			isDurationLog
		);
		addToGrouping(resultStatsMap, resultStats);

		// console.log(`${framework}:`);
		// console.log(resultStats);
	}

	// Compute differences and print table
	for (let [key, results] of resultStatsMap.entries()) {
		if (listAtEnd.includes(key)) {
			continue;
		}

		logDifferences(key, results);
	}

	for (let key of listAtEnd) {
		if (resultStatsMap.has(key)) {
			logDifferences(key, resultStatsMap.get(key));
		}
	}
}
