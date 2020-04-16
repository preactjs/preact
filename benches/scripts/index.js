const sade = require('sade');
const { generateSingleConfig } = require('./config');
const { runBenches } = require('./bench');

const prog = sade('./scripts');

prog
	.command('config [bench]')
	.describe('Generate the config for the given benchmark HTML file.')
	.action(generateSingleConfig);

prog
	.command('bench [globs]')
	.describe(
		'Run the benchmarks matching the given globs. The root for the globs is the "src" directory. Specify "all" to run all benchmarks (default). To get more help on options, see polymer/tachometer help. Result table is printed to stdout and written to a csv and json file in the results directory.'
	)
	.example('bench text*')
	.example('bench *.html')
	.example('bench all')
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
