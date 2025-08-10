#!/usr/bin/env node
/**
 * Generalized build script replacing former microbundle-based per-package builds.
 *
 * Usage:
 *   npm run build              # build all packages
 *   node scripts/build-packages.cjs core hooks  # build subset
 */
const path = require('node:path');
const fs = require('node:fs/promises');
const { build } = require('esbuild');
const babel = require('@babel/core');
const { minify } = require('terser');
const zlib = require('node:zlib');
const { init: initEsmLexer, parse } = require('es-module-lexer');
const MagicStringModule = require('magic-string');
const MagicString = MagicStringModule.default || MagicStringModule;

/**
 * Very small ESM -> CJS transform tailored to the output shape we get from esbuild.
 * We currently only need to support converting a final `export { a as b, c }` list
 * (esbuild's style when there are no external static imports) into CJS named exports
 * plus a CommonJS default export object. If later we re-introduce static imports,
 * we can extend this to rewrite import statements into require() calls (see microbundle-2 approach).
 *
 * @param {string} code
 * @param {{ filename?: string }} opts
 */
function transformEsmToCjs(code, opts = {}) {
	// @ts-expect-error
	const ms = new MagicString(code);
	const originalCode = code;
	// Initialize lexer parsing mainly for future extension; presently we just parse exports list.
	let exportsMeta;
	let importsMeta;
	try {
		const [imports, exports] = parse(code);
		importsMeta = imports;
		exportsMeta = exports;
	} catch (e) {
		// Fallback: continue without structured export info
	}

	// 1. Rewrite static import statements to CommonJS require (consolidated per source)
	if (importsMeta && importsMeta.length) {
		const perSource = new Map();
		for (const im of importsMeta) {
			if (im.d > -1) continue; // skip dynamic
			const src = im.n;
			if (!src) continue;
			// capture original statement text
			const start = im.ss; // statement start
			let end = im.se; // statement end (after semicolon)
			const stmtText = code.slice(start, end);
			if (
				/^\s*export\s+\*/.test(stmtText) ||
				/^\s*export\s+\{/.test(stmtText)
			) {
				// skip re-export statements here; handle later
				continue;
			}
			perSource.set(src, perSource.get(src) || { decls: [], ranges: [] });
			perSource.get(src).ranges.push([start, end]);
			perSource.get(src).decls.push(stmtText);
		}
		const insertionPieces = [];
		perSource.forEach((info, src) => {
			// Parse combined declarations for this source
			let defaultName = null;
			let nsName = null;
			const namedSet = new Set();
			for (const stmt of info.decls) {
				// import ... from "src"; OR import "src";
				if (/^\s*import\s+['"]/m.test(stmt)) {
					// side-effect only
					continue;
				}
				const fromIdx = stmt.lastIndexOf('from');
				let head = fromIdx >= 0 ? stmt.slice(0, fromIdx) : stmt;
				head = head.replace(/^\s*import\s*/, '').trim();
				if (!head || head.startsWith('//')) continue;
				if (head.startsWith('* as ')) {
					nsName = head.slice(5).trim();
					continue;
				}
				// default + optional named
				if (head.startsWith('{')) {
					// only named
					collectNamed(head, namedSet);
				} else if (head.includes('{')) {
					const m = head.match(/([^,]+),\s*(\{.*\})/);
					if (m) {
						defaultName = defaultName || m[1].trim();
						collectNamed(m[2], namedSet);
					}
				} else if (!head.startsWith('{')) {
					defaultName = defaultName || head.trim();
				}
			}
			const named = Array.from(namedSet);
			const safeBase = src.replace(/[^a-zA-Z0-9_$]/g, '_');
			const temp = `__req_${safeBase}`;
			if (nsName) {
				insertionPieces.push(
					`const ${nsName} = require(${JSON.stringify(src)});`
				);
			}
			if (defaultName && (named.length || nsName)) {
				insertionPieces.push(
					`const ${temp} = require(${JSON.stringify(src)});`
				);
				insertionPieces.push(
					`const ${defaultName} = ${temp}.default || ${temp};`
				);
				if (named.length)
					insertionPieces.push(`const { ${named.join(', ')} } = ${temp};`);
			} else if (defaultName) {
				insertionPieces.push(
					`let ${defaultName} = require(${JSON.stringify(src)});`
				);
				insertionPieces.push(
					`${defaultName} && ${defaultName}.__esModule && (${defaultName} = ${defaultName}.default);`
				);
			} else if (named.length && !nsName) {
				insertionPieces.push(
					`const { ${named.join(', ')} } = require(${JSON.stringify(src)});`
				);
			} else if (!defaultName && !named.length && !nsName) {
				// side effect only
				insertionPieces.push(`require(${JSON.stringify(src)});`);
			}
			// remove all original ranges
			for (const [s, e] of info.ranges) ms.remove(s, e);
		});
		if (insertionPieces.length) {
			let insertionPoint = 0;
			if (code.startsWith('#!')) insertionPoint = code.indexOf('\n') + 1;
			ms.prependLeft(insertionPoint, insertionPieces.join('\n') + '\n');
		}
	}

	function collectNamed(block, set) {
		const inner = block.replace(/[{}]/g, '').trim();
		if (!inner) return;
		inner.split(',').forEach(part => {
			part = part.trim();
			if (!part) return;
			// transform alias syntax a as b -> a: b for object destructuring
			const m = part.match(/^(.*?)\s+as\s+(.*)$/);
			if (m) {
				set.add(`${m[1].trim()}: ${m[2].trim()}`);
			} else {
				set.add(part);
			}
		});
	}

	// 2. Handle simple `export default <expr>;` (non function/class decl) patterns
	code = ms.toString();
	const exportDefaultRegex = /export\s+default\s+([^;]+);/g;
	let exportDefaultMatch;
	while ((exportDefaultMatch = exportDefaultRegex.exec(code))) {
		const full = exportDefaultMatch[0];
		const expr = exportDefaultMatch[1].trim();
		const start = exportDefaultMatch.index;
		const end = start + full.length;
		ms.overwrite(start, end, `exports.default = ${expr};`);
	}

	// Gather export list matches from originalCode to avoid index drift
	const exportListMatches = [];
	{
		const exportRegex = /export\s*\{([^}]*)\};?/g;
		let m;
		while ((m = exportRegex.exec(originalCode))) {
			exportListMatches.push({
				start: m.index,
				end: m.index + m[0].length,
				inner: m[1]
			});
		}
	}

	let allExports = [];
	for (const m of exportListMatches) {
		const parts = m.inner
			.split(',')
			.map(s => s.trim())
			.filter(Boolean);
		for (const part of parts) {
			const mm = part.match(/^(.*?)\s+as\s+(.*)$/);
			if (mm) {
				allExports.push({ local: mm[1].trim(), exported: mm[2].trim() });
			} else if (part) {
				allExports.push({ local: part, exported: part });
			}
		}
		ms.remove(m.start, m.end);
	}

	if (allExports.length === 0 && exportsMeta && exportsMeta.length) {
		// Fallback: use lexer data if regex didn't match.
		allExports = exportsMeta
			.map(e => ({ local: e.n, exported: e.n }))
			.filter(x => x.local);
	}

	// 3. Re-export handling (export * from / export { a as b } from)
	// Collect re-export statements separately so we can generate getters in legacy mode.
	/** @type {Array<{ kind: 'star', source: string } | { kind: 'named', source: string, items: Array<{ imported: string, exported: string }> }>} */
	const reExports = [];
	{
		const starRe = /export\s*\*\s*from\s*['"]([^'\"]+)['"];?/g;
		let m;
		while ((m = starRe.exec(code))) {
			reExports.push({ kind: 'star', source: m[1] });
			ms.remove(m.index, m.index + m[0].length);
		}
		const namedRe = /export\s*\{([^}]+)\}\s*from\s*['"]([^'\"]+)['"];?/g;
		while ((m = namedRe.exec(code))) {
			const inner = m[1];
			const source = m[2];
			const items = inner
				.split(',')
				.map(s => s.trim())
				.filter(Boolean)
				.map(part => {
					const mm = part.match(/^(.*?)\s+as\s+(.*)$/);
					if (mm) return { imported: mm[1].trim(), exported: mm[2].trim() };
					return { imported: part, exported: part };
				});
			reExports.push({ kind: 'named', source, items });
			ms.remove(m.index, m.index + m[0].length);
		}
	}

	// Unified getter-based mode with re-export support (always on)
	const requireMap = new Map();
	let reqIndex = 0;
	for (const r of reExports) {
		if (!requireMap.has(r.source)) {
			const safe = r.source.replace(/[^a-zA-Z0-9_$]/g, '_');
			const varName = `__reexp_${safe}_${reqIndex++}`;
			requireMap.set(r.source, varName);
		}
	}
	const exportGetters = [];
	const exportNamesSet = new Set();
	for (const { local, exported } of allExports) {
		if (exported === 'default') continue;
		if (exportNamesSet.has(exported)) continue;
		exportNamesSet.add(exported);
		exportGetters.push(
			`Object.defineProperty(exports, ${JSON.stringify(exported)}, { enumerable: true, get: function () { return ${local}; } });`
		);
	}
	for (const r of reExports) {
		const modVar = requireMap.get(r.source);
		if (r.kind === 'named') {
			for (const it of r.items) {
				if (it.exported === 'default' || exportNamesSet.has(it.exported))
					continue;
				exportNamesSet.add(it.exported);
				exportGetters.push(
					`Object.defineProperty(exports, ${JSON.stringify(it.exported)}, { enumerable: true, get: function () { return ${modVar}[${JSON.stringify(it.imported)}]; } });`
				);
			}
		} else if (r.kind === 'star') {
			exportGetters.push(
				`for (var __k in ${modVar}) if (__k !== 'default' && __k !== '__esModule' && !Object.prototype.hasOwnProperty.call(exports, __k)) Object.defineProperty(exports, __k, { enumerable: true, get: (function(k){ return function(){ return ${modVar}[k]; }; })(__k) });`
			);
		}
	}
	exportGetters.unshift(
		'Object.defineProperty(exports, "__esModule", { value: true });'
	);
	if (requireMap.size) {
		let insertionPoint = 0;
		const current = ms.toString();
		if (current.startsWith('#!')) insertionPoint = current.indexOf('\n') + 1;
		const reqLines = [];
		requireMap.forEach((v, src) => {
			reqLines.push(`var ${v} = require(${JSON.stringify(src)});`);
		});
		ms.prependLeft(insertionPoint, reqLines.join('\n') + '\n');
	}
	if (exportNamesSet.size) {
		exportGetters.push('var __defaultCache;');
		exportGetters.push(
			'Object.defineProperty(exports, "default", { enumerable: true, get: function() { return __defaultCache || (__defaultCache = {' +
				Array.from(exportNamesSet)
					.map(n => `${JSON.stringify(n)}: exports[${JSON.stringify(n)}]`)
					.join(',') +
				'}); } });'
		);
	}
	if (exportGetters.length) ms.append('\n' + exportGetters.join('\n'));

	return { code: ms.toString(), map: ms.generateMap({ hires: true }) };
}

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

		// Ensure lexer ready (async init is a promise)
		await initEsmLexer;

		// Build ESM authoritative bundle
		await build({
			...shared,
			format: 'esm',
			outfile: path.join(distDir, pkg.base + '.mjs'),
			minify: false
		});

		const esmFile = path.join(distDir, pkg.base + '.mjs');
		const esmCode = String(await fs.readFile(esmFile));
		const cjs = transformEsmToCjs(esmCode, { filename: pkg.base + '.mjs' });
		const cjsFile = path.join(distDir, pkg.base + '.js');
		await fs.writeFile(cjsFile, cjs.code + '\n');
		if (cjs.map) {
			await fs.writeFile(cjsFile + '.map', cjs.map.toString());
		}

		await Promise.all([
			minifyFile(cjsFile, cjsFile, { module: true }),
			minifyFile(esmFile, esmFile, { module: true })
		]);

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
	for (const row of sizeRows)
		console.log([row.pkg, row.file, row.raw, row.gz, row.br].join('\t'));
	console.log('\nDone.');
}

main().catch(err => {
	console.error('[build] Failed:', err);
	process.exit(1);
});
