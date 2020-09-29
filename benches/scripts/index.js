import sade from 'sade';
import { generateSingleConfig } from './config.js';
import { defaultDeoptsOptions, runDeopts } from './deopts.js';
import { defaultBenchOptions, runBenches } from './bench.js';

const prog = sade('./scripts');

// Tests:
// - npm start
prog
	.command('config [bench]')
	.describe('Generate the config for the given benchmark HTML file.')
	.action(generateSingleConfig);

// Tests:
// - many* -n 2 -t 0
// - many* -n 2 -t 0 -f preact-local -f preact-v8
// - many* -n 2 -t 0 -f preact-local -f preact-v8 -b chrome
prog
	.command('bench [globs]')
	.describe(
		'Run the benchmarks matching the given globs. The root for the globs is the "src" directory. Specify "all" to run all benchmarks (default). To get more help on options, see polymer/tachometer help. Result table is printed to stdout and written to a csv and json file in the results directory.'
	)
	.example('bench text*')
	.example('bench *.html')
	.example('bench all')
	.example('bench many* -f preact-local -f preact-master')
	.option(
		'--browser, -b',
		'Which browsers to launch in automatic mode, comma-delimited (chrome, chrome-headless, firefox, firefox-headless, safari, edge, ie)',
		defaultBenchOptions.browser
	)
	// TODO: Consider parsing and adding to configs
	// .option(
	// 	'--window-size',
	// 	'"width,height" in pixels of the browser windows that will be created',
	// 	defaultOptions['window-size']
	// )
	.option(
		'--sample-size, -n',
		'Minimum number of times to run each benchmark',
		defaultBenchOptions['sample-size']
	)
	.option(
		'--horizon, -h',
		'The degrees of difference to try and resolve when auto-sampling ("N%" or "Nms", comma-delimited)',
		defaultBenchOptions.horizon
	)
	.option(
		'--timeout, -t',
		'The maximum number of minutes to spend auto-sampling',
		defaultBenchOptions.timeout
	)
	.option(
		'--framework, -f',
		'Which framework(s) to bench. Specify the flag multiple times to compare specific frameworks. Default is all frameworks',
		defaultBenchOptions.framework
	)
	.action(runBenches);

// Tests:
// - (no args)
// - many*
// - many* -f preact-local -f preact-v8
prog
	.command('deopts [benchmark]')
	.describe(
		'Run v8-deopt-viewer against the specified benchmark file (defaults to many_updates.html). If a glob is given, only the first matching file will be run'
	)
	.example('deopts many_updates.html')
	.example('deopts many*')
	.example('deopts many* -f preact-local')
	.example('deopts many* -f preact-local -f preact-master')
	.option(
		'--framework, -f',
		'The framework to run the benchmark with.',
		defaultDeoptsOptions.framework
	)
	.option(
		'--timeout, -t',
		'How long in seconds to keep the browser open while the benchmark runs. Passed to v8-deopt-viewer.',
		defaultDeoptsOptions.timeout
	)
	.option(
		'--open',
		'Open the resulting v8-deopt-viewer result in the browser upon completion',
		defaultDeoptsOptions.open
	)
	.action(runDeopts);

prog.parse(process.argv);
