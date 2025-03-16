#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import { relative, resolve, posix } from 'node:path';
import sade from 'sade';
// import {context, analyzeMetafile, type BuildOptions, type Format} from 'esbuild';
import { initialize, context } from 'esbuild';
import MagicString from 'magic-string';
import { parse } from 'es-module-lexer';
import { minify } from 'terser';

// start the esbuild service early
initialize({});

// import type {MinifyOptions} from 'terser';
// const slowDeps = (async () => {
// 	const {default: MagicString} = await import('magic-string');
// 	const {parse} = await import('es-module-lexer');
// 	const {minify} = await import('terser');
// 	return {MagicString, parse, minify};
// })();

const color = (code, end) => str => `\x1B[${code}m${str}\x1B[${end}m`;
const bold = color(1, 22);
const underline = color(4, 24);
const dim = color(2, 22);
// const red = color(31, 39);
const brightBlue = color(94, 39);
const brightWhite = color(97, 39);
const deAnsi = str => str.replace(/\x1B\[\d+m/g, '');
const padAnsi = (str, len, padding) => {
	const count = len - deAnsi(str).length;
	return str.padEnd(str.length + count, padding);
};

function prettyBytes(value) {
	if (value > 1.5e6) return `${Number((value / 1e6).toFixed(1))}${dim('mb')}`;
	if (value > 1.5e3) return `${Number((value / 1e3).toFixed(1))}${dim('kb')}`;
	return `${value}${dim('b')}`;
}

// function getExports(exports: PackageExports, map: Record<string, {mapped: string, conditions: string[]}[]> = {}, path = '.', conditions: string[] = []): {path: string, mapped: string, conditions: string[]}[] {
function getExports(exports, map = {}, path = '.', conditions = []) {
	if (typeof exports === 'string') {
		conditions = Array.from(new Set(conditions)).sort();
		// return [{path, mapped: exports, conditions}];
		let c = map[path] || (map[path] = []);
		if (!c.find(c => c.conditions.join('\n') === conditions.join('\n'))) {
			c.push({ mapped: exports, conditions });
		}
		return map;
	}
	// if ('.' in exports) return getExports(exports['.'], map, path, conditions);
	let isPath;
	for (let key in exports) {
		if (isPath === undefined) isPath = key[0] === '.';
		if ((key[0] === '.') !== isPath) {
			throw Error(
				`Package Exports cannot contain mixed conditions and paths: ${Object.keys(
					exports
				)}`
			);
		}
		if (isPath) {
			getExports(exports[key], map, posix.join(path, key), conditions.slice());
		} else {
			const childConditions =
				key === 'default' ? conditions.slice() : conditions.concat(key);
			getExports(exports[key], map, path, childConditions);
		}
	}
	return map;
	// return results.flat();
}

async function looseResolve(cwd, file) {
	if (file.includes('*')) return `./${relative(cwd, file)}`;
	const stat = await fs.stat(file).catch(() => null);
	if (stat?.isDirectory()) return looseResolve(cwd, `${file}/index`);
	if (file.match(/\.[cm]js$/)) return `./${relative(cwd, file)}`;
	return (
		(
			await Promise.all(
				['.ts', '.tsx', '.jsx', '.mjs', '.cjs', '.js'].map(async ext => {
					const f = `./${relative(cwd, file + ext)}`;
					try {
						if ((await fs.stat(resolve(cwd, f))).isFile()) return f;
					} catch {}
				})
			)
		).find(Boolean) ?? file
	);
}

async function build(args) {
	const cwd = args.cwd || process.cwd();

	const pkg = JSON.parse(
		await fs.readFile(resolve(cwd, 'package.json'), 'utf-8')
	);
	const external = Object.keys(pkg.dependencies || []).concat(
		Object.keys(pkg.peerDependencies || [])
	);
	if (args.external === 'none') external.length = 0;

	let exports = getExports(pkg.exports || {});

	await Promise.all(
		Object.keys(exports).map(async key => {
			if (!key.includes('*')) return;
			const mapping = exports[key];
			const explicitSrc = mapping.find(
				m => m.conditions[0] === 'source'
			)?.mapped;
			const src = explicitSrc || key;
			const [before, after] = src.split('*');
			const list = await fs.readdir(resolve(cwd, before));
			await Promise.all(
				list.map(async item => {
					if (item === '.') return;
					if (after && after[0] !== '/') {
						if (item.endsWith(after)) item = item.slice(0, -after.length);
						else return;
					}
					const stats = await fs
						.stat(resolve(cwd, before + item + after))
						.catch(() => null);
					if (!stats || stats.isDirectory()) return;
					const itemNoExt = explicitSrc
						? item
						: item.replace(/\.([mc]?[jt]sx?|d\.ts)$/, '');
					exports[key.replace('*', itemNoExt)] = mapping.map(m => ({
						mapped: m.mapped.replace('*', itemNoExt),
						conditions: m.conditions.slice()
					}));
				})
			);
			delete exports[key];
		})
	);

	// console.log(exports);

	if (Object.keys(exports).length === 0) {
		const inferredExports = {};
		// console.log(cwd, pkg.main);
		// const main = await looseResolve(cwd, pkg.main || 'index');
		let main = pkg.main || 'index';
		let ext = main.match(/\.[mc]?js$/)?.[0];
		if (!ext) main += ext = '.js';
		if (ext === '.mjs' || (pkg.type === 'module' && ext === '.js')) {
			inferredExports.import = inferredExports.module = main;
		} else {
			inferredExports.default = main;
		}
		if (pkg.module) {
			inferredExports.import = inferredExports.module = await looseResolve(
				cwd,
				pkg.module
			);
		}
		console.log('inferring exports', inferredExports);
		exports = getExports(inferredExports);
	}

	// console.log('exports: ', exports);

	// const esmEntries = exports.filter((({mapped, conditions}) => {
	// 	if (conditions.includes('require')) return false;
	// 	if (conditions.includes('import') || conditions.includes('module')) return true;
	// 	// if (!conditions.includes('default') && conditions.length > 0) return false;
	// 	if (pkg.type === 'module' && mapped.endsWith('.js')) return true;
	// 	return mapped.endsWith('.mjs');
	// }));

	// const entryPaths = Array.from(new Set(Object.keys(exports).filter(entry => !entry.endsWith('/') && !entry.includes('*'))));
	const entryPaths = await Promise.all(
		Array.from(new Set(Object.keys(exports))).map(file => {
			return file;
		})
	);
	// console.log('entryPaths: ', entryPaths);

	let src = cwd;
	if ((await fs.stat(resolve(cwd, 'src')).catch(() => null))?.isDirectory()) {
		src += '/src';
	}
	const entryPoints = await Promise.all(
		entryPaths.map(file => {
			const explicitSrc = exports[file].find(
				m => m.conditions[0] === 'source'
			)?.mapped;
			return looseResolve(
				cwd,
				explicitSrc || `${src}/${file === '.' ? 'index' : file}`
			);
		})
	);

	// console.log('entries: ', entryPoints);

	external.push(pkg.name);
	for (const entry of entryPaths) {
		if (entry !== '.') external.push(pkg.name + '/' + entry);
	}

	// console.log('external: ', external);

	let formats = ['esm', 'cjs'];
	if (args.format) formats = args.format.split(/\s*,\s*/);

	// const entryPoints = ['a'];
	let mangleCache = {};
	// let outdir = 'dist';

	const baseOptions = {
		absWorkingDir: resolve(cwd),
		entryPoints,
		bundle: true,
		// minify: !!args.minify,
		// minifyIdentifiers: true,
		minifySyntax: !!args.minify,
		minifyWhitespace: !!args.minify,
		legalComments: args.minify ? 'none' : 'inline',
		treeShaking: true,
		sourcemap: args.sourcemap && (args.minify ? 'inline' : true),
		// target: ['es2017'],
		target: ['es2020'],
		platform: 'browser',
		external,
		outdir: './dist',
		// splitting: true,
		chunkNames: '[dir]/[name]-[hash]',
		assetNames: '[dir]/[name]-[hash]',
		entryNames: '[dir]/[name]',
		// jsx: 'automatic',
		jsxSideEffects: false,
		color: true,
		// outdir,
		mangleProps: /(^_|_$)/,
		mangleCache,
		metafile: true
		// write: args.minify !== 'terser'
	};

	const madeDirs = new Set();
	const mkdir = dir => {
		dir = resolve(cwd, dir);
		if (madeDirs.has(dir)) return;
		madeDirs.add(dir);
		return fs.mkdir(dir, { recursive: true }).catch(Boolean);
	};

	const extForFormat = format => {
		if (format === 'cjs' && pkg.type === 'module') return '.cjs';
		if (format === 'esm' && pkg.type !== 'module') return '.mjs';
		return '.js';
	};

	const formatsWithoutCjs = formats.filter(f => f !== 'cjs');
	const contexts = await Promise.all(
		formatsWithoutCjs.map(format => {
			const ext = extForFormat(format);

			const eps = entryPoints.map((input, index) => ({
				in: input,
				out: exports[entryPaths[index]]
					.find(m => {
						if (format === 'cjs' && m.conditions.includes('require'))
							return true;
						if (
							format === 'esm' &&
							(m.conditions.includes('module') ||
								m.conditions.includes('import'))
						)
							return true;
						return (
							m.conditions.includes('default') || m.conditions.length === 0
						);
					})
					?.mapped.replace(/\.[mc]?js$/, '')
			}));

			// find common dir prefix:
			const mkdirDone = Promise.all(
				eps.map(ep => mkdir(posix.dirname(ep.out)))
			);
			const outdir = eps
				.map(ep => ep.out.replace(/(^\.\/|\/[^/]+$)/g, '').split('/'))
				.reduce((last, next) => {
					for (let i = 0; i < last.length; i++) {
						if (last[i] !== next[i]) {
							last.length = i;
							break;
						}
					}
					return last;
				})
				.join('/');
			for (const ep of eps) ep.out = relative(outdir, ep.out);
			// const mkdirDone = mkdir(outdir);

			// console.log(format, outdir, eps);
			return context({
				...baseOptions,
				// outExtension: {
				// 	'.js': '',
				// 	'.cjs': '',
				// 	'.mjs': '',
				// },
				splitting: format === 'esm',
				outExtension: {
					'.js': ext
				},
				entryPoints: eps,
				format,
				write: format !== 'esm',
				// write: format !== 'cjs',
				// plugins: format === 'cjs' ? [
				plugins:
					format === 'esm' && formats.includes('cjs')
						? [
								{
									name: 'esm-to-cjs',
									setup(build) {
										build.onEnd(async result => {
											// const {default: MagicString} = await import('magic-string');
											// const {parse} = await import('es-module-lexer');
											// const {minify} = await import('terser');
											await mkdirDone;
											const _exports = exports;
											const outputs = Object.values(result.metafile.outputs);
											const terserOpts = {
												ecma: 2020,
												compress: {
													unsafe: true,
													unsafe_proto: true, // for eliding unreferenced Object.prototype.x
													passes: 10
												},
												format: {
													shebang: true,
													shorthand: true,
													comments: false
												},
												nameCache: mangleCache,
												module: true,
												mangle: {
													properties: {
														regex: /^_/
													}
												}
											};
											await Promise.all(
												result.outputFiles.map(async (file, index) => {
													const output = outputs[index];
													let code = file.text;
													// bugfix: esbuild uses a fairly brutal workaround for object spread,
													// which is imported by almost every file.
													code = code.replace(
														/\b__spreadValues *= *\(a, *b\) *=> *\{.*?\};/gs,
														'__spreadValues=(a,b)=>({__proto__: null, ...a, ...b});'
													);
													if (args.minify) {
														const minified = await minify(code, {
															...terserOpts,
															mangle: {
																...Object(terserOpts.mangle),
																reserved: output.exports
															},
															sourceMap: args.sourcemap && {
																content: 'inline'
															}
														});
														code = minified.code;
													}
													// update metafile size with terser-minified size:
													result.metafile.outputs[
														relative(cwd, file.path)
													].bytes = code.length;
													const esmWritten = fs.writeFile(file.path, code);
													// const esmWritten = fs.writeFile(file.path, file.contents);
													const exportConfig =
														(output.entryPoint &&
															_exports[output.entryPoint]) ||
														null;
													// const exportConfig = _exports[entryPaths[index]];
													const cjsFilename =
														exportConfig?.find(m => {
															return (
																m.conditions.includes('require') ||
																m.conditions.includes('default') ||
																m.conditions.length === 0
															);
														})?.mapped ||
														file.path.replace(
															/\.[mc]?js$/,
															extForFormat('cjs')
														);

													const out = new MagicString(code, {
														filename: file.path
													});
													const [imports, exports] = await parse(
														code,
														file.path
													);
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
																!/await\s+/s.test(before) ||
																!/^\s*[)\],;\n]/.test(after)
															) {
																out.overwrite(imp.ss, imp.se, req);
																req = `new Promise(r=>r(${req}))`;
															}
															out.overwrite(imp.ss, imp.se, req);
														} else {
															const rawSpec = code.substring(imp.s, imp.e);
															const spec = JSON.stringify(
																rawSpec.replace(
																	/\.[mc]?js$/,
																	extForFormat('cjs')
																)
															);
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
															const r = `${
																s ? `const ${s} = ` : ''
															}require(${spec})`;
															out.overwrite(imp.ss, imp.se, r);
														}
														beforeStart = imp.se;
													}
													const defaultExport = exports.find(
														p => p.n === 'default'
													);
													const namedExports = exports.filter(
														p => p.n !== 'default'
													);
													const hasNamed = !!namedExports.length;
													let suffix = [];

													if (args.cjs === 'flat' && defaultExport) {
														// "flat" mode, where named exports are properties of the default export
														suffix.push(`module.exports=${defaultExport.ln}`);
														for (const exp of namedExports) {
															suffix.push(
																`module.exports[${exp.n}]=${exp.ln || exp.n}`
															);
														}
													} else if (
														defaultExport &&
														!hasNamed &&
														args.cjs !== 'default'
													) {
														// default-only CJS optimization
														suffix.push(`module.exports=${defaultExport.ln}`);
													} else {
														// mixed default+named, or named-only, or default-as-named
														const list = exports.map(
															exp =>
																`${exp.n}${
																	exp.ln && exp.ln !== exp.n ? ':' + exp.ln : ''
																}`
														);
														if (list.length)
															suffix.push(`module.exports={${list.join(',')}}`);
													}

													out.overwrite(
														code.slice(0, exports[0].s).lastIndexOf('export'),
														code.indexOf('}', exports.at(-1).e) + 1,
														suffix.join(';')
													);

													if (reexports) {
														const mapped = reexports.map(
															exp =>
																`Object.defineProperties(module.exports,Object.getOwnPropertyDescriptors(${exp}))`
														);
														out.append(`\n${mapped.join(';')}`);
														// const descs = reexports.map(exp => `...Object.getOwnPropertyDescriptors(${exp})`);
														// out.append(`Object.defineProperties(module.exports,{${descs.join(',')}})`);
													}

													const text = out.toString();
													// result.outputFiles!.push({
													// 	path: cjsFilename,
													// 	text,
													// 	get contents() {
													// 		const value = Buffer.from(text, 'utf-8');
													// 		Object.defineProperty(this, 'contents', {value});
													// 		return value;
													// 	},
													// 	hash: file.hash,
													// });
													result.metafile.outputs[relative(cwd, cjsFilename)] =
														{
															...output,
															bytes: text.length
														};

													await fs.writeFile(cjsFilename, text);
													await esmWritten;
													// await fs.writeFile(file.path, out.toString());
												})
											);
											// console.log(result.outputFiles);
										});
									}
								}
							]
						: []
				// outfile: exports['x'],
				// plugins: format === 'cjs' ? [
				// 	{
				// 		name: 'cjs',
				// 		setup(build) {
				// 			build.onLoad({
				// 				filter: /./,
				// 				namespace: 'customcjs'
				// 			}, (args) => {
				// 				console.log(args);
				// 				return {
				// 					contents: `export default require(${JSON.stringify(args.path)})`,
				// 					loader: 'js'
				// 				};
				// 			});
				// 			build.onResolve({
				// 				filter: new RegExp(`^${pkg.name}(\/|$)`)
				// 			}, (args) => {
				// 				console.log(args);
				// 				return {
				// 					external: true,
				// 					// external: args.namespace === 'customcjs',
				// 					// external: args.kind === 'require-call',
				// 					namespace: 'customcjs',
				// 					path: args.path
				// 				}
				// 			});
				// 		},
				// 	}
				// ] : [],
			});
		})
	);

	async function cancel() {
		clearTimeout(timer);
		// @todo - probably fine to not await cancellation
		await Promise.all(contexts.map(ctx => ctx.cancel()));
	}

	let isFirst = true;
	let timer;
	let rebuilding = false;
	async function runBuild() {
		if (rebuilding) await cancel();
		rebuilding = true;
		if (isFirst) isFirst = false;
		else console.log('rebuilding...');
		const start = performance.now();
		// const terserOpts: import('terser').MinifyOptions = {
		// 	ecma: 2020,
		// 	compress: {unsafe: true},
		// 	format: {shebang: true, shorthand: true, comments: false},
		// 	nameCache: mangleCache,
		// 	mangle: {
		// 		properties: {
		// 			regex: /^_/
		// 		}
		// 	},
		// };
		const results = await Promise.all(
			contexts.map(async (ctx, index) => {
				const result = await ctx.rebuild();
				if (index === 0) mangleCache = result.mangleCache;
				// const format = formats[index];
				// if (format === 'cjs') {
				// 	await Promise.all(result.outputFiles!.map(async file => {
				// 		const code = file.text
				// 			.replace(/\b__toCommonJS\((.*?)\)/g, `Object.defineProperty($1,'__esModule',{value:true})`)
				// 			.replace('var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);', '')
				// 			.replace(/var __copyProps =.*?};/gs, '');
				// 		const {minify} = await import('terser');
				// 		await fs.writeFile(file.path, (await minify(code,{compress:true,mangle:false,toplevel:true})).code!);
				// 		// await fs.writeFile(file.path, code);
				// 	}));
				// }

				// const format = formats[index];
				// if (args.minify === 'terser') {
				// 	const {minify} = await import('terser');
				// 	await Promise.all(result.outputFiles!.map(async file => {
				// 		const minified = await minify(file.text, {
				// 			...terserOpts,
				// 			module: format === 'esm',
				// 		});
				// 		await fs.writeFile(file.path, minified.code!);
				// 	}));
				// }
				return result;
			})
		);
		const dur = performance.now() - start;
		console.log(`built in ${dur | 0}ms:`);
		const table = [];
		for (const result of results) {
			const { inputs, outputs } = result.metafile;
			// console.log(outputs);
			const exported = new Set();
			for (const exp in exports) {
				const spec = posix.join(pkg.name, exp);
				const mappings = exports[exp];
				const formats = {};
				for (const mapping of mappings) {
					const id = posix.normalize(mapping.mapped);
					const output = outputs[id];
					if (!output) continue;
					exported.add(id);
					const cd = mapping.conditions.join('+');
					const ext = id.match(/[mc]?js$/)?.[0];
					const fallback = args.format
						? args.format
						: ext === 'mjs' || (ext === 'js' && pkg.type === 'module')
							? 'esm'
							: 'cjs';
					const type = /(import|module)/.test(cd)
						? 'esm'
						: /require/.test(cd)
							? 'cjs'
							: fallback;
					formats[type] = output.bytes;
				}
				table.push({
					type: 'entry',
					name: spec.replace(pkg.name + '/', dim(`${pkg.name}/`)),
					formats
				});
			}
			const chunks = {};
			for (const id in outputs) {
				if (exported.has(id)) continue;
				const output = outputs[id];
				const ep = output.entryPoint || id.replace(/\.[mc]?js$/, '');
				(chunks[ep] || (chunks[ep] = [])).push({ id, output });
			}
			for (const ep in chunks) {
				const outputs = chunks[ep];
				const formats = {};
				outputs.map(({ id, output }) => {
					const ext = id.match(/[mc]?js$/)?.[0];
					const type =
						ext === 'mjs' || (ext === 'js' && pkg.type === 'module')
							? 'esm'
							: args.format || 'cjs';
					formats[type] = output.bytes;
				});
				table.push({ type: 'chunk', name: dim('./') + ep, formats });
			}
		}
		const flatTable = table.map(item => {
			return [
				item.type === 'entry'
					? `📦 ${brightWhite(item.name)}`
					: `   ↳ ${item.name}`,
				...formats.map(format => prettyBytes(item.formats[format]))
				// prettyBytes(item.formats.esm),
				// prettyBytes(item.formats.cjs)
			];
		});
		// flatTable.unshift(['', 'esm', 'cjs']);
		flatTable.unshift(['', ...formats]);
		const widths = flatTable.reduce(
			(widths, row) => {
				for (let i = 0; i < row.length; i++) {
					widths[i] = Math.max(widths[i] || 0, deAnsi(row[i]).length);
				}
				return widths;
			},
			[0]
		);
		const text = flatTable
			.map((row, index) => {
				const text = row
					.map((cell, i) => padAnsi(cell, widths[i] + 1))
					.join(' ');
				if (index === 0) return bold(brightBlue(text));
				return text;
			})
			.join('\n');
		process.stdout.write(text + '\n');
		// const analysis = await Promise.all(results.map(result => analyzeMetafile(result.metafile!, {color:true})));
		// process.stdout.write(analysis + '\n');
		rebuilding = false;
	}

	try {
		await runBuild();
	} catch (err) {
		console.error(err);
		for (const ctx of contexts) await ctx.dispose();
		process.exit(1);
	}

	if (args.watch) {
		for await (const change of fs.watch(args.cwd, { recursive: true })) {
			console.log(change);
			clearTimeout(timer);
			if (rebuilding) cancel();
			timer = setTimeout(() => runBuild().catch(() => {}), 10);
		}
	}

	process.exit(0);
}

async function buildAction(entry, opts) {
	opts.entry = entry;
	if (!opts.cwd) opts.cwd = process.cwd();
	try {
		await build(opts);
	} catch (err) {
		process.stderr.write(err?.message ?? String(err));
	}
}

const indent = ' '.repeat(22);
const cli = sade('microbundle')
	.version('1.0.0')
	.option(
		'--cjs',
		'Customize CommonJS output:' +
			dim(`
		• "flat" merges named exports into the default export
		• "default" forces require("x").default even when there are no named exports`).replace(
				/^\s*/gm,
				indent
			)
	)
	.option('--minify', 'minify generated code', true)
	.option('--cwd', 'run in the given directory (default: $PWD)');

cli
	.command('build [entry]', dim`Build once and exit`, { default: true })
	.action(buildAction);

cli
	.command('watch [entry]', dim`Build once, then rebuild when files change`)
	.action((entry, opts) => buildAction(entry, { ...opts, watch: true }));

cli.parse(process.argv);
