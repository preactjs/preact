#!/usr/bin/env node
/**
 * Generalized build script replacing former microbundle-based per-package builds.
 *
 * Usage:
 *   npm run build              # build all packages
 *   node scripts/build-packages.cjs core hooks  # build subset
 *
 * Pipeline per package:
 *  esbuild (ESM) -> manual CJS transform -> esbuild IIFE (UMD) -> terser minification (in-place)
 *  Property rename (internal) via babel-plugin-transform-rename-properties using root mangle.json
 */
const path = require('node:path');
const fs = require('node:fs/promises');
const { build } = require('esbuild');
const babel = require('@babel/core');
const { minify } = require('terser');
const zlib = require('node:zlib');

async function main() {
	const root = path.join(__dirname, '..');
	const pkgRoot = JSON.parse(
		String(await fs.readFile(path.join(root, 'package.json')))
	);
	const mangleConfig = JSON.parse(
		String(await fs.readFile(path.join(root, 'mangle.json')))
	);

	const packages = [
		{
			id: 'core',
			dir: '.',
			entry: 'src/index.js',
			base: 'preact',
			globalName: pkgRoot.amdName || 'preact'
		},
		{
			id: 'hooks',
			dir: 'hooks',
			entry: 'src/index.js',
			base: 'hooks',
			globalName: 'preactHooks'
		},
		{
			id: 'compat',
			dir: 'compat',
			entry: 'src/index.js',
			base: 'compat',
			globalName: 'preactCompat'
		},
		{
			id: 'debug',
			dir: 'debug',
			entry: 'src/index.js',
			base: 'debug',
			globalName: 'preactDebug'
		},
		{
			id: 'devtools',
			dir: 'devtools',
			entry: 'src/index.js',
			base: 'devtools',
			globalName: 'preactDevtools'
		},
		{
			id: 'test-utils',
			dir: 'test-utils',
			entry: 'src/index.js',
			base: 'testUtils',
			globalName: 'preactTestUtils'
		},
		{
			id: 'jsx-runtime',
			dir: 'jsx-runtime',
			entry: 'src/index.js',
			base: 'jsxRuntime',
			globalName: 'preactJsxRuntime'
		}
	];

	const args = process.argv.slice(2).filter(Boolean);
	let selected = packages;
	if (args.length && !args.includes('all')) {
		const wanted = new Set(args);
		selected = packages.filter(p => wanted.has(p.id));
		const missing = Array.from(wanted).filter(
			x => !selected.some(p => p.id === x)
		);
		if (missing.length) {
			console.error('[build] Unknown package id(s):', missing.join(', '));
			process.exit(1);
		}
	}

	const rename = {};
	for (const original in mangleConfig.props.props) {
		let name = original;
		if (name.startsWith('$')) name = name.slice(1);
		rename[name] = mangleConfig.props.props[original];
	}

	const babelCache = new Map();
	function babelRenamePlugin() {
		return {
			name: 'babel-rename-properties',
			setup(buildApi) {
				buildApi.onLoad({ filter: /\/src\/.*\.js$/ }, async args => {
					const code = String(await fs.readFile(args.path));
					const cacheKey = args.path + '::' + code;
					const cached = babelCache.get(cacheKey);
					if (cached) return cached;
					const result = await babel.transformAsync(code, {
						filename: args.path,
						babelrc: false,
						configFile: false,
						presets: [],
						plugins: [['babel-plugin-transform-rename-properties', { rename }]]
					});
					const out = { contents: result.code, loader: 'js' };
					babelCache.set(cacheKey, out);
					return out;
				});
			}
		};
	}

	const reserved = mangleConfig.minify.mangle.properties.reserved;
	Object.values(mangleConfig.props.props).forEach(n => reserved.push(n));
	const terserBase = {
		toplevel: true,
		compress: {
			...mangleConfig.minify.compress,
			unsafe: true,
			pure_getters: true,
			keep_infinity: true,
			unsafe_proto: true,
			passes: 10,
			toplevel: true
		},
		mangle: {
			toplevel: true,
			properties: { ...mangleConfig.minify.mangle.properties, reserved }
		},
		format: {
			shebang: true,
			shorthand: true,
			wrap_func_args: false,
			comments: /^\s*([@#]__[A-Z]+__\s*$|@cc_on)/,
			preserve_annotations: true
		},
		module: true,
		sourceMap: true
	};

	async function minifyFile(inputPath, outputPath, { module }) {
		const code = String(await fs.readFile(inputPath));
		const result = await minify(code, {
			...terserBase,
			module,
			sourceMap: {
				filename: path.basename(outputPath),
				url: path.basename(outputPath) + '.map'
			}
		});
		await fs.writeFile(outputPath, result.code + '\n');
		if (result.map)
			await fs.writeFile(
				outputPath + '.map',
				typeof result.map === 'string' ? result.map : JSON.stringify(result.map)
			);
	}

	const sizeRows = [];

	for (const pkg of selected) {
		const absDir = path.join(root, pkg.dir);
		const distDir = path.join(absDir, 'dist');
		const entryAbs = path.join(absDir, pkg.entry);
		await fs.mkdir(distDir, { recursive: true });

		const shared = {
			entryPoints: [entryAbs],
			external: [
				'preact',
				'preact/jsx-runtime',
				'preact/compat',
				'preact/hooks',
				'preact/debug',
				'preact/test-utils',
				'preact/devtools',
				'preact-render-to-string'
			],
			bundle: true,
			sourcemap: true,
			sourcesContent: true,
			plugins: [babelRenamePlugin()],
			target: ['es2020'],
			define: { 'process.env.NODE_ENV': '"production"' }
		};

		await build({
			...shared,
			format: 'esm',
			outfile: path.join(distDir, pkg.base + '.mjs'),
			minify: false
		});

		// TODO: use es-module-lexer to transform
		// ESM into CJS

		// TODO: ensure UMD build uses globals rather than inlining
		await build({
			...shared,
			format: 'iife',
			globalName: pkg.globalName,
			outfile: path.join(distDir, pkg.base + '.umd.js'),
			minify: false
		});

		await Promise.all([
			minifyFile(
				path.join(distDir, pkg.base + '.js'),
				path.join(distDir, pkg.base + '.js'),
				{ module: true }
			),
			minifyFile(
				path.join(distDir, pkg.base + '.mjs'),
				path.join(distDir, pkg.base + '.mjs'),
				{ module: true }
			),
			minifyFile(
				path.join(distDir, pkg.base + '.umd.js'),
				path.join(distDir, pkg.base + '.umd.js'),
				{ module: false }
			)
		]);

		for (const ext of ['.js', '.mjs', '.umd.js']) {
			const file = pkg.base + ext;
			const abs = path.join(distDir, file);
			const code = await fs.readFile(abs);
			const raw = code.length;
			const gz = zlib.gzipSync(code).length;
			const br = zlib.brotliCompressSync(code, {
				params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
			}).length;
			sizeRows.push({
				pkg: pkg.id,
				file: path.relative(root, abs),
				raw,
				gz,
				br
			});
		}
	}

	console.log('\n[build] Artifact sizes (bytes):');
	console.log(['Package', 'File', 'Raw', 'Gzip', 'Brotli'].join('\t'));
	for (const row of sizeRows)
		console.log([row.pkg, row.file, row.raw, row.gz, row.br].join('\t'));
	console.log('\nDone.');
}

main().catch(err => {
	console.error('[build] Failed:', err);
	process.exit(1);
});
