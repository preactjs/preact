#!/usr/bin/env node
/**
 * Optimized build script for preact packages with microbundle-style CJS transforms
 */
const path = require('node:path');
const fs = require('node:fs/promises');
const { build } = require('esbuild');
const babel = require('@babel/core');
const { minify } = require('terser');
const zlib = require('node:zlib');
const { init: initEsmLexer, parse } = require('es-module-lexer');
const MagicString = require('magic-string');

/**
 * Transform ESM to CJS using destructured imports
 */
async function transformEsmToCjs(code, filePath, mode = 'default') {
	// @ts-expect-error
	const out = new MagicString(code, {
		filename: filePath
	});
	const [imports, exports] = await parse(code, filePath);
	// const exports = _exports.slice();
	let beforeStart = 0;
	// let wildcard = 0;
	const reexports = [];
	for (const imp of imports) {
		// const exp = exports.find(exp => exp.s >= imp.ss && exp.e <= imp.se);
		if (imp.t === 2) {
			let req = `require(${code.slice(imp.s, imp.e)})`;
			// if this is an `await import()` with no Promise chaining,
			// we don't need to wrap it in a Promise - await works fine
			// and sync throw in async function gets coerced.
			const before = code.slice(beforeStart, imp.ss);
			const after = code.slice(imp.se, imp.se + 10);
			if (
				// @ts-ignore
				!/await\s+/s.test(before) ||
				!/^\s*[)\],;\n]/.test(after)
			) {
				out.overwrite(imp.ss, imp.se, req);
				req = `new Promise(r=>r(${req}))`;
			}
			out.overwrite(imp.ss, imp.se, req);
		} else {
			const rawSpec = code.substring(imp.s, imp.e);
			const spec = JSON.stringify(rawSpec.replace(/\.[mc]?js$/, '.js'));
			let s = code
				.substring(imp.ss + 6, imp.s - 1)
				.replace(/\s*from\s*/g, '')
				.replace(/\*\s*as\s*/g, '')
				.replace(/\s*as\s*/g, ':')
				.trim();
			// convert wildcard reexports to `$_wc_$0=require()` for later reexport via
			// Object.defineProperties(exports,Object.getOwnPropertyDescriptors($_wc_$0))
			if (s === '*' && code[imp.ss] === 'e') {
				s = `$_wc_$${reexports.length}`;
				reexports.push(s);
			}
			const r = `${s ? `const ${s} = ` : ''}require(${spec})`;
			out.overwrite(imp.ss, imp.se, r);
		}
		beforeStart = imp.se;
	}
	const defaultExport = exports.find(p => p.n === 'default');
	const namedExports = exports.filter(p => p.n !== 'default');
	const hasNamed = !!namedExports.length;
	let suffix = [];

	if (mode === 'flat' && defaultExport) {
		// "flat" mode, where named exports are properties of the default export
		suffix.push(`module.exports=${defaultExport.ln}`);
		for (const exp of namedExports) {
			suffix.push(`module.exports[${exp.n}]=${exp.ln || exp.n}`);
		}
	} else if (defaultExport && !hasNamed && mode !== 'default') {
		// default-only CJS optimization
		suffix.push(`module.exports=${defaultExport.ln}`);
	} else {
		// mixed default+named, or named-only, or default-as-named
		const list = exports.map(
			exp => `${exp.n}${exp.ln && exp.ln !== exp.n ? ':' + exp.ln : ''}`
		);
		if (list.length) suffix.push(`module.exports={${list.join(',')}}`);
	}

	if (exports[0]) {
		out.overwrite(
			code.slice(0, exports[0].s).lastIndexOf('export'),
			code.indexOf('}', exports.at(-1).e) + 1,
			suffix.join(';')
		);
	}

	if (reexports) {
		const mapped = reexports.map(
			exp =>
				`Object.defineProperties(module.exports,Object.getOwnPropertyDescriptors(${exp}))`
		);
		out.append(`\n${mapped.join(';')}`);
		// const descs = reexports.map(exp => `...Object.getOwnPropertyDescriptors(${exp})`);
		// out.append(`Object.defineProperties(module.exports,{${descs.join(',')}})`);
	}
	return { code: out.toString(), map: out.generateMap({ hires: true }) };
}

async function main() {
	const root = path.join(__dirname, '..');
	const pkgRoot = JSON.parse(
		// @ts-expect-error
		await fs.readFile(path.join(root, 'package.json'), 'utf8')
	);
	const mangleConfig = JSON.parse(
		// @ts-expect-error
		await fs.readFile(path.join(root, 'mangle.json'), 'utf8')
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

	// Property mangling setup
	const rename = {};
	for (const original in mangleConfig.props.props) {
		let name = original.startsWith('$') ? original.slice(1) : original;
		rename[name] = mangleConfig.props.props[original];
	}

	const babelCache = new Map();
	function babelRenamePlugin() {
		return {
			name: 'babel-rename-properties',
			setup(buildApi) {
				buildApi.onLoad({ filter: /\/src\/.*\.js$/ }, async args => {
					const code = await fs.readFile(args.path, 'utf8');
					const cacheKey = args.path + '::' + code;
					if (babelCache.has(cacheKey)) return babelCache.get(cacheKey);

					// @ts-expect-error
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

	const reserved = [
		...mangleConfig.minify.mangle.properties.reserved,
		...Object.values(mangleConfig.props.props)
	];
	const terserBase = {
		toplevel: true,
		compress: {
			...mangleConfig.minify.compress,
			pure_getters: true,
			hoist_vars: false,
			hoist_funs: false,
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
			shorthand: true,
			wrap_func_args: false,
			comments: /^\s*([@#]__[A-Z]+__\s*$|@cc_on)/,
			preserve_annotations: true
		},
		module: true,
		sourceMap: true
	};

	async function minifyFile(inputPath, outputPath, { module }) {
		const code = await fs.readFile(inputPath, 'utf8');

		// For ESM files, use different Terser options to avoid hoisting vars above imports
		const options = {
			...terserBase,
			module,
			sourceMap: {
				filename: path.basename(outputPath),
				url: path.basename(outputPath) + '.map'
			}
		};

		// @ts-expect-error
		const result = await minify(code, options);
		await fs.writeFile(outputPath, result.code + '\n');
		if (result.map) {
			await fs.writeFile(
				outputPath + '.map',
				typeof result.map === 'string' ? result.map : JSON.stringify(result.map)
			);
		}
	}

	const sizeRows = [];
	await initEsmLexer;

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

		// Build ESM first
		await build({
			...shared,
			format: 'esm',
			outfile: path.join(distDir, pkg.base + '.mjs'),
			minify: false
		});

		// Transform to CJS
		const esmFile = path.join(distDir, pkg.base + '.mjs');
		const esmCode = await fs.readFile(esmFile, 'utf8');
		const cjs = await transformEsmToCjs(esmCode, esmFile, 'default');
		const cjsFile = path.join(distDir, pkg.base + '.js');
		await fs.writeFile(cjsFile, cjs.code + '\n');

		if (cjs.map) {
			await fs.writeFile(cjsFile + '.map', cjs.map.toString());
		}

		// Minify both
		await Promise.all([
			minifyFile(cjsFile, cjsFile, { module: true }),
			minifyFile(esmFile, esmFile, { module: true })
		]);

		// Report sizes
		for (const ext of ['.js', '.mjs']) {
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
	for (const row of sizeRows) {
		console.log([row.pkg, row.file, row.raw, row.gz, row.br].join('\t'));
	}
	console.log('\nDone.');
}

main().catch(err => {
	console.error('[build] Failed:', err);
	process.exit(1);
});
