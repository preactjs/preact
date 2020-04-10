const sade = require('sade');
const { generateDefaultConfig } = require('./config');
const { runBenches } = require('./bench');

const prog = sade('scripts');

prog
	.command('config')
	.describe('Generate default config to run all benches')
	.action(generateDefaultConfig);

prog
	.command('bench [globs]')
	.describe(
		'Run the benchmarks matching the given globs. The cwd for glob is the src directory. Specify "all" to run all benchmarks. To get more help on options, see polymer/tachometer help'
	)
	// TODO: Consider parsing and adding to configs
	// .option(
	// 	'--browser, -b',
	// 	'Which browsers to launch in automatic mode, comma-delimited (chrome, chrome-headless, firefox, firefox-headless, safari, edge, ie)',
	// 	'chrome'
	// )
	// .option(
	// 	'--window-size',
	// 	'"width,height" in pixels of the browser windows that will be created',
	// 	'1024,768'
	// )
	.option(
		'--sample-size, -n',
		'Minimum number of times to run each benchmark',
		50
	)
	.option(
		'--horizon',
		'The degrees of difference to try and resolve when auto-sampling ("N%" or "Nms", comma-delimited)',
		'10%'
	)
	.option(
		'--timeout',
		'The maximum number of minutes to spend auto-sampling',
		3
	)
	.action(runBenches);

prog.parse(process.argv);
