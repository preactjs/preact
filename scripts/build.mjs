/**
 * Build: Rollup → Babel (per module, downlevel + mangle.json property
 * renames) → Terser (minify + property mangle name cache).
 *
 *   node ./scripts/build.mjs             build everything
 *   node ./scripts/build.mjs --watch [pkg...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	gzipSync,
	brotliCompressSync,
	constants as zlibConstants
} from 'node:zlib';
import { rollup } from 'rollup';
import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { minify } from 'terser';
import fastRest from './babel-plugin-fast-rest.mjs';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');

const PACKAGES = [
	{ cwd: '.' },
	{ cwd: 'compat' },
	{ cwd: 'debug' },
	{ cwd: 'devtools' },
	{ cwd: 'hooks' },
	{ cwd: 'jsx-runtime' },
	{ cwd: 'test-utils' }
];

const BROWSER_TARGETS = [
	'chrome >= 40',
	'safari >= 9',
	'firefox >= 36',
	'edge >= 12',
	'not dead'
];

function readJson(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function renameMap() {
	const rename = {};
	const mangle = readJson(path.resolve(ROOT, 'mangle.json'));
	for (const prop in mangle.props.props) {
		const name = prop[0] === '$' ? prop.slice(1) : prop;
		rename[name] = mangle.props.props[prop];
	}
	return rename;
}

/** The package's mangle.json doubles as terser's mangle name cache; packages
 * without one (test-utils) use their package.json `mangle` field, uncached. */
function loadMangle(cwd) {
	const file = path.resolve(cwd, 'mangle.json');
	let nameCache = null;
	let options;
	if (fs.existsSync(file)) {
		nameCache = readJson(file);
		options = nameCache.minify || {};
	} else {
		const meta = readJson(path.resolve(cwd, 'package.json'));
		options = { mangle: { properties: meta.minify || meta.mangle || {} } };
	}
	const properties = (options.mangle && options.mangle.properties) || {};
	return {
		file,
		nameCache,
		knownProps: nameCache ? { ...(nameCache.props || {}).props } : null,
		compress: options.compress || {},
		properties: {
			...properties,
			regex: properties.regex && new RegExp(properties.regex),
			reserved: properties.reserved || []
		}
	};
}

function minifyPlugin(pkg) {
	return {
		name: 'minify',
		async renderChunk(code) {
			const mangle = loadMangle(pkg.cwd);

			const result = await minify(code, {
				compress: {
					keep_infinity: true,
					pure_getters: true,
					passes: 10,
					...mangle.compress
				},
				format: {
					wrap_func_args: false,
					comments: /^\s*([@#]__[A-Z]+__\s*$|@cc_on)/,
					preserve_annotations: true
				},
				module: false,
				ecma: 5,
				toplevel: true,
				mangle: { properties: mangle.properties },
				nameCache: mangle.nameCache,
				sourceMap: true
			});

			// unmapped private properties get a bundle-local name; pin them in
			// mangle.json when another package needs to access them
			if (mangle.nameCache) {
				const after = (mangle.nameCache.props || {}).props || {};
				const fresh = Object.keys(after).filter(k => !(k in mangle.knownProps));
				if (fresh.length) {
					console.warn(
						`WARN [${pkg.name}]: properties mangled without a ${path.relative(ROOT, mangle.file)} entry: ` +
							fresh.map(k => k.slice(1)).join(', ')
					);
				}
			}

			return { code: result.code, map: result.map };
		}
	};
}

function outputOptions(pkg, file) {
	return {
		format: 'es',
		file,
		sourcemap: true,
		strict: false,
		freeze: false,
		plugins: [minifyPlugin(pkg)]
	};
}

function createBundle(pkg) {
	return rollup({
		input: path.resolve(pkg.cwd, pkg.meta.source),
		external: pkg.cwd === ROOT ? () => false : id => /^preact($|\/)/.test(id),
		treeshake: { propertyReadSideEffects: false },
		onwarn(warning, warn) {
			if (warning.code === 'CIRCULAR_DEPENDENCY') return;
			if (warning.code === 'MIXED_EXPORTS') return;
			warn(warning);
		},
		plugins: [
			nodeResolve({
				mainFields: ['module', 'jsnext', 'main'],
				browser: true,
				exportConditions: ['browser'],
				extensions: ['.mjs', '.js', '.jsx', '.json', '.node']
			}),
			babel({
				babelHelpers: 'bundled',
				extensions: ['.js', '.jsx', '.mjs'],
				exclude: /\/node_modules\//,
				babelrc: false,
				configFile: false,
				presets: [
					[
						'@babel/preset-env',
						{
							loose: true,
							modules: false,
							useBuiltIns: false,
							targets: { browsers: BROWSER_TARGETS },
							exclude: ['@babel/plugin-transform-typeof-symbol']
						}
					]
				],
				plugins: [
					['babel-plugin-transform-rename-properties', { rename: renameMap() }],
					[fastRest, { helper: false, literal: true }]
				]
			})
		]
	});
}

async function buildPackage(pkg) {
	const bundle = await createBundle(pkg);
	const file = path.resolve(pkg.cwd, pkg.meta.module);
	const { output } = await bundle.write(outputOptions(pkg, file));
	await bundle.close();

	return { name: pkg.name, written: [{ file, code: output[0].code }] };
}

function printSizes(results) {
	for (const { name, written } of results) {
		console.log(
			`Build "${name}" to ${path.relative(ROOT, path.dirname(written[0].file))}:`
		);
		for (const { file, code } of written) {
			const buf = Buffer.from(
				code.replace(/\n?\/\/# sourceMappingURL=.*\s*$/, ''),
				'utf8'
			);
			const gz = gzipSync(buf, { level: 9 }).length;
			const br = brotliCompressSync(buf, {
				params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 }
			}).length;
			console.log(`${String(gz).padStart(11)} B: ${path.basename(file)}.gz`);
			console.log(`${String(br).padStart(11)} B: ${path.basename(file)}.br`);
		}
	}
}

function resolvePackages(names) {
	const packages = PACKAGES.map(pkg => {
		const cwd = path.resolve(ROOT, pkg.cwd);
		const meta = readJson(path.resolve(cwd, 'package.json'));
		return { ...pkg, cwd, meta, name: meta.name };
	});
	if (!names.length) return packages;
	return packages.filter(
		pkg =>
			names.includes(pkg.name) ||
			names.includes(path.relative(ROOT, pkg.cwd) || '.')
	);
}

async function watchMode(packages) {
	for (const pkg of packages) {
		const rebuild = async () => {
			const start = Date.now();
			try {
				const result = await buildPackage(pkg);
				console.log(`${pkg.name} rebuilt in ${Date.now() - start}ms`);
				printSizes([result]);
			} catch (e) {
				console.error(`${pkg.name} failed: ${e.message}`);
			}
		};
		await rebuild();
		fs.watch(path.resolve(pkg.cwd, 'src'), { recursive: true }, () => {
			clearTimeout(pkg._debounce);
			pkg._debounce = setTimeout(rebuild, 50);
		});
	}
	console.log('Watching for changes...');
}

const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const packages = resolvePackages(args.filter(a => a !== '--watch'));

if (isWatch) {
	await watchMode(packages);
} else {
	const start = Date.now();
	const results = await Promise.all(packages.map(buildPackage));
	printSizes(results);
	console.log(`Built ${packages.length} packages in ${Date.now() - start}ms`);
}
