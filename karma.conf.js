var coverage = String(process.env.COVERAGE) === 'true',
	minify = String(process.env.MINIFY) === 'true',
	downlevel = String(process.env.DOWNLEVEL) === 'true',
	performance = !coverage && String(process.env.PERFORMANCE) !== 'false',
	path = require('path'),
	errorstacks = require('errorstacks'),
	kl = require('kolorist');

const babel = require('@babel/core');
const fs = require('fs').promises;

// This strips Karma's annoying `LOG: '...'` string from logs
const orgStdoutWrite = process.stdout.write;
process.stdout.write = msg => {
	let out = '';
	const match = msg.match(
		/(^|.*\s)(LOG|WARN|ERROR):\s'__LOG_CUSTOM:([\S\s]*)'/
	);
	if (match && match.length >= 4) {
		// Sometimes the UA of the browser will be included in the message
		if (match[1].length) {
			out += kl.yellow(kl.italic(match[1]));
			out += match[3]
				.split('\n')
				.map(line => '  ' + line)
				.join('\n');
		} else {
			out += match[3];
		}
		out += '\n';
	} else if (/(^|.*\s)(LOG|WARN|ERROR):\s([\S\s]*)/.test(msg)) {
		// Nothing
	} else {
		out = msg;
	}

	return orgStdoutWrite.call(process.stdout, out);
};

var localLaunchers = {
	ChromeNoSandboxHeadless: {
		base: 'Chrome',
		flags: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			// See https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md
			'--headless',
			'--disable-gpu',
			'--no-gpu',
			// Without a remote debugging port, Google Chrome exits immediately.
			'--remote-debugging-port=9333'
		]
	}
};

const subPkgPath = pkgName => {
	if (!minify) {
		return path.join(__dirname, pkgName, 'src', 'index.js');
	}

	// Resolve from package.exports field
	const stripped = pkgName.replace(/[/\\./]/g, '');
	const pkgJson = path.join(__dirname, 'package.json');
	const pkgExports = require(pkgJson).exports;
	const file = pkgExports[stripped ? `./${stripped}` : '.'].browser;
	return path.join(__dirname, file);
};

// Esbuild plugin for aliasing + babel pass
function createEsbuildPlugin() {
	const pending = new Map();
	const cache = new Map();

	const rename = {};
	const mangle = require('./mangle.json');
	for (let prop in mangle.props.props) {
		let name = prop;
		if (name[0] === '$') {
			name = name.slice(1);
		}

		rename[name] = mangle.props.props[prop];
	}

	const alias = {
		'preact/debug': subPkgPath('./debug/'),
		'preact/devtools': subPkgPath('./devtools/'),
		'preact/compat': subPkgPath('./compat/'),
		'preact/hooks': subPkgPath('./hooks/'),
		'preact/test-utils': subPkgPath('./test-utils/'),
		'preact/jsx-runtime': subPkgPath('./jsx-runtime/'),
		'preact/jsx-dev-runtime': subPkgPath('./jsx-runtime/'),
		preact: subPkgPath('')
	};
	return {
		name: 'custom',
		setup(build) {
			// Aliasing: If "MINIFY" is set to "true" we use the dist/
			// files instead of those from src/
			build.onResolve({ filter: /^preact.*/ }, args => {
				const pkg = alias[args.path];
				return {
					path: pkg
				};
			});

			build.onResolve({ filter: /^(react|react-dom)$/ }, args => {
				const pkg = alias['preact/compat'];
				return {
					path: pkg
				};
			});

			// Apply babel pass whenever we load a .js file
			build.onLoad({ filter: /\.[mc]?js$/ }, async args => {
				const contents = await fs.readFile(args.path, 'utf-8');

				// Using a cache is crucial as babel is 30x slower than esbuild
				const cached = cache.get(args.path);
				if (cached && cached.input === contents) {
					return {
						contents: cached.result,
						resolveDir: path.dirname(args.path),
						loader: 'js'
					};
				}

				let result = contents;

				// Check if somebody already requested the current file. If they
				// did than we push a listener instead of doing a duplicate
				// transform of the same file. This is crucial for build perf.
				if (!pending.has(args.path)) {
					pending.set(args.path, []);

					const tmp = await babel.transformAsync(result, {
						filename: args.path,
						sourceMaps: 'inline',
						presets: downlevel
							? [
									[
										'@babel/preset-env',
										{
											loose: true,
											modules: false,
											targets: {
												browsers: ['last 2 versions', 'IE >= 11']
											}
										}
									]
								]
							: [],
						plugins: [
							coverage && [
								'istanbul',
								{
									include: minify ? '**/dist/**/*.js' : '**/src/**/*.js'
								}
							]
						].filter(Boolean)
					});
					result = tmp.code || result;
					cache.set(args.path, { input: contents, result });

					// Fire all pending listeners that are waiting on the same
					// file transformation
					const waited = pending.get(args.path);
					pending.delete(args.path);
					waited.forEach(fn => fn());
				} else {
					// Subscribe to the existing transformation completion call
					await new Promise(r => {
						pending.get(args.path).push(r);
					});
					result = cache.get(args.path).result;
				}

				return {
					contents: result,
					resolveDir: path.dirname(args.path),
					loader: 'js'
				};
			});
		}
	};
}

module.exports = function (config) {
	config.set({
		browsers: Object.keys(localLaunchers),

		frameworks: ['mocha', 'chai-sinon'],

		reporters: ['mocha'].concat(coverage ? 'coverage' : []),

		formatError(msg) {
			const frames = errorstacks.parseStackTrace(msg);
			if (!frames.length || frames[0].column === -1) return '\n' + msg + '\n';

			const frame = frames[0];
			const filePath = kl.lightCyan(
				frame.fileName.replace(__dirname + '/', '')
			);

			const indentMatch = msg.match(/^(\s*)/);
			const indent = indentMatch ? indentMatch[1] : '  ';
			const location = kl.yellow(`:${frame.line}:${frame.column}`);
			return `${indent}at ${frame.name} (${filePath}${location})\n`;
		},

		coverageReporter: {
			dir: path.join(__dirname, 'coverage'),
			reporters: [
				{ type: 'text-summary' },
				{ type: 'html' },
				{ type: 'lcovonly', subdir: '.', file: 'lcov.info' }
			]
		},

		mochaReporter: {
			showDiff: true
		},

		browserLogOptions: { terminal: true },
		browserConsoleLogOptions: { terminal: true },

		browserNoActivityTimeout: 5 * 60 * 1000,

		captureTimeout: 0,

		customLaunchers: localLaunchers,

		files: [
			{ pattern: 'test/polyfills.js', watched: false },
			{
				pattern:
					config.grep ||
					'{debug,devtools,hooks,compat,test-utils,jsx-runtime,}/test/{browser,shared}/**/*.test.js',
				watched: false,
				type: 'js'
			}
		],

		mime: {
			'text/javascript': ['js', 'jsx']
		},

		preprocessors: {
			'{debug,devtools,hooks,compat,test-utils,jsx-runtime,}/test/**/*': [
				'esbuild'
			]
		},

		esbuild: {
			// karma-esbuild options
			singleBundle: false,

			// esbuild options
			target: downlevel ? 'es5' : 'es2015',
			define: {
				COVERAGE: JSON.stringify(coverage),
				'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || ''),
				ENABLE_PERFORMANCE: JSON.stringify(performance)
			},
			plugins: [createEsbuildPlugin()]
		}
	});
};
