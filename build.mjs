#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { transformAsync } from '@babel/core';
import { minify } from 'terser';
import fs from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

// Load mangle configuration
const mangleConfig = JSON.parse(readFileSync('./mangle.json', 'utf8'));

// Track built artifacts for size reporting
const builtArtifacts = [];

// Utility function to format file sizes
function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Function to calculate file size and gzipped size
async function getFileSizes(filePath) {
	try {
		const content = await fs.readFile(filePath);
		const size = content.length;
		const gzipSize = gzipSync(content).length;
		return { size, gzipSize };
	} catch (error) {
		console.warn(`⚠️  Could not read file ${filePath} for size calculation`);
		return { size: 0, gzipSize: 0 };
	}
}

// Create rename mapping for Babel plugin
const rename = {};
for (let prop in mangleConfig.props.props) {
	let name = prop;
	if (name[0] === '$') {
		name = name.slice(1);
	}
	rename[name] = mangleConfig.props.props[prop];
}

// Build configurations for different packages
const buildConfigs = [
	{
		name: 'preact',
		entry: 'src/index.js',
		outDir: 'dist',
		filename: 'preact',
		globalName: 'preact'
	},
	{
		name: 'preact/debug',
		entry: 'debug/src/index.js',
		outDir: 'debug/dist',
		external: ['preact'],
		filename: 'debug',
		globalName: 'preactDebug'
	},
	{
		name: 'preact/devtools',
		entry: 'devtools/src/index.js',
		outDir: 'devtools/dist',
		external: ['preact'],
		filename: 'devtools',
		globalName: 'preactDevtools'
	},
	{
		name: 'preact/hooks',
		entry: 'hooks/src/index.js',
		outDir: 'hooks/dist',
		external: ['preact'],
		filename: 'hooks',
		globalName: 'preactHooks'
	},
	{
		name: 'preact/test-utils',
		entry: 'test-utils/src/index.js',
		external: ['preact'],
		outDir: 'test-utils/dist',
		filename: 'testUtils',
		globalName: 'preactTestUtils'
	},
	{
		name: 'preact/compat',
		entry: 'compat/src/index.js',
		outDir: 'compat/dist',
		filename: 'compat',
		globalName: 'preactCompat',
		external: ['preact/hooks', 'preact'],
		globals: { 'preact/hooks': 'preactHooks' }
	},
	{
		name: 'preact/jsx-runtime',
		entry: 'jsx-runtime/src/index.js',
		outDir: 'jsx-runtime/dist',
		filename: 'jsxRuntime',
		external: ['preact'],
		globalName: 'preactJsxRuntime'
	}
];

// Formats to build for each package
const formats = ['cjs', 'esm', 'umd'];

// Function to apply Babel transformations
async function applyBabelTransform(code, filename) {
	try {
		const result = await transformAsync(code, {
			filename,
			configFile: false,
			babelrc: false,
			presets: [],
			plugins: [['babel-plugin-transform-rename-properties', { rename }]]
		});
		return result.code;
	} catch (error) {
		console.error(`Babel transform failed for ${filename}:`, error);
		throw error;
	}
}

async function minifyWithTerser(code, filename, format = 'esm') {
	try {
		// More aggressive optimization for UMD and CJS builds
		const isUmd = format === 'umd' || filename.includes('.umd.');
		const isCjs = format === 'cjs' || filename.endsWith('.js');
		const isEsm = format === 'esm' || filename.endsWith('.mjs');

		const result = await minify(code, {
			...mangleConfig.minify,
			mangle: {
				// TODO: this is the issue with the CommonJS export
				// losing its exports
				properties: isCjs
					? false
					: {
							regex: mangleConfig.props.regex,
							keep_quoted: mangleConfig.props.keep_quoted,
							reserved: Object.values(rename)
						},
				toplevel: isUmd,
				eval: true
			},
			compress: {
				keep_infinity: true,
				pure_getters: true,
				passes: 10,
				// Additional optimizations for UMD/CJS
				collapse_vars: true,
				reduce_vars: true,
				dead_code: true,
				evaluate: true,
				join_vars: true,
				reduce_funcs: true,
				// UMD-specific optimizations
				toplevel: isUmd
			},
			format: {
				wrap_func_args: false,
				comments: false,
				shorthand: true,
				preserve_annotations: true,
				beautify: false
			},
			ecma: 2020,
			sourceMap: true,
			module: isEsm,
			toplevel: isUmd
		});
		return result;
	} catch (error) {
		console.error(`Terser minification failed for ${filename}:`, error);
		throw error;
	}
}

// Function to build a single package in a specific format
async function buildPackage(config, format) {
	const {
		name,
		entry,
		outDir,
		filename,
		globalName,
		external = [],
		globals = {}
	} = config;

	if (!existsSync(entry)) {
		console.warn(`⚠️  Entry file ${entry} not found, skipping ${name}`);
		return;
	}

	console.log(`📦 Building ${name} (${format})...`);

	// Determine output extension and format
	const extensions = {
		cjs: '.js',
		esm: '.mjs',
		umd: '.umd.js'
	};

	const outputFile = path.join(outDir, `${filename}${extensions[format]}`);
	const mapFile = path.join(outDir, `${filename}${extensions[format]}.map`);

	// ESBuild configuration
	const esbuildConfig = /** @type {import('esbuild').BuildOptions} */ {
		entryPoints: [entry],
		bundle: true,
		format: format === 'cjs' ? 'cjs' : format === 'esm' ? 'esm' : 'iife',
		platform: 'browser',
		target: ['es2020'],
		jsx: 'transform',
		jsxFactory: 'h',
		jsxFragment: 'Fragment',
		jsxSideEffects: false,
		color: true,
		metafile: true,
		external,
		sourcemap: true,
		globalName: format === 'umd' ? globalName : undefined,
		plugins: [],
		write: false, // We'll handle writing ourselves
		minify: false, // We'll handle minification with Terser
		treeShaking: true
	};

	// Add globals for UMD builds
	if (format === 'umd' && Object.keys(globals).length > 0) {
		esbuildConfig.globalName = globalName;
		// ESBuild doesn't support globals directly, we'll need to handle externals differently
	}

	try {
		// Build with ESBuild
		// @ts-expect-error
		const result = await esbuild.build(esbuildConfig);
		let code = result.outputFiles[0].text;

		// Apply Babel transformations
		code = await applyBabelTransform(code, outputFile);

		// Ensure output directory exists
		await fs.mkdir(path.dirname(outputFile), { recursive: true }); // Write unminified version
		const minified = await minifyWithTerser(code, outputFile, format);
		if (typeof minified.map === 'string') {
			minified.code = `${minified.code}\n//# sourceMappingURL=${path.basename(mapFile)}`;
			await fs.writeFile(mapFile, minified.map);
		} else if (minified.map) {
			minified.code = `${minified.code}\n//# sourceMappingURL=${path.basename(mapFile)}`;
			minified.map = JSON.stringify(minified.map);
			await fs.writeFile(mapFile, minified.map);
		}
		await fs.writeFile(outputFile, minified.code);
		console.log(`✅ Built ${outputFile}`);

		// Track artifact for size reporting
		const sizes = await getFileSizes(outputFile);
		builtArtifacts.push({
			name: `${name} (${format})`,
			file: outputFile,
			...sizes
		});

		// Create minified version for UMD builds
		if (format === 'umd') {
			const minifiedCode = await minifyWithTerser(code, outputFile, 'umd');
			const minifiedFile = path.join(outDir, `${filename}.min.js`);
			const minMapFile = path.join(outDir, `${filename}.min.js.map`);

			if (typeof minifiedCode.map === 'string') {
				minifiedCode.code = `${minifiedCode.code}\n//# sourceMappingURL=${path.basename(minMapFile)}`;
				await fs.writeFile(minMapFile, minifiedCode.map);
			} else if (minifiedCode.map) {
				minifiedCode.code = `${minifiedCode.code}\n//# sourceMappingURL=${path.basename(minMapFile)}`;
				const mapContent = JSON.stringify(minifiedCode.map);
				await fs.writeFile(minMapFile, mapContent);
			}

			await fs.writeFile(minifiedFile, minifiedCode.code);
			console.log(`✅ Minified ${minifiedFile}`);

			// Track minified artifact for size reporting
			const minSizes = await getFileSizes(minifiedFile);
			builtArtifacts.push({
				name: `${name} (${format} minified)`,
				file: minifiedFile,
				...minSizes
			});
		}
	} catch (error) {
		console.error(`❌ Failed to build ${name} (${format}):`, error);
		throw error;
	}
}

// Main build function
async function build() {
	console.log('🚀 Starting Preact build with ESBuild + Babel + Terser...\n');

	const startTime = Date.now();
	let successful = 0;
	let failed = 0;

	const promises = [];
	// Build each package in each format
	for (const config of buildConfigs) {
		for (const format of formats) {
			promises.push(
				buildPackage(config, format)
					.then(() => {
						successful++;
					})
					.catch(error => {
						console.error(`❌ Build failed for ${config.name} (${format})`);
						failed++;
					})
			);
		}
	}

	await Promise.all(promises);
	console.log(); // Empty line between packages

	const endTime = Date.now();
	const duration = ((endTime - startTime) / 1000).toFixed(2);

	console.log(`\n🎉 Build completed in ${duration}s`);
	console.log(`✅ Successful: ${successful}`);
	if (failed > 0) {
		console.log(`❌ Failed: ${failed}`);
	}

	// Display size report
	if (builtArtifacts.length > 0) {
		console.log('\n📊 Build Size Report:');
		console.log('─'.repeat(80));

		// Sort artifacts by size for better readability
		const sortedArtifacts = [...builtArtifacts].sort((a, b) => b.size - a.size);

		// Calculate column widths for nice formatting
		const maxNameLength = Math.max(...sortedArtifacts.map(a => a.name.length));
		const maxSizeLength = Math.max(
			...sortedArtifacts.map(a => formatBytes(a.size).length)
		);

		// Print header
		const nameHeader = 'Package'.padEnd(maxNameLength);
		const sizeHeader = 'Size'.padStart(maxSizeLength);
		const gzipHeader = 'Gzipped';
		console.log(`${nameHeader} | ${sizeHeader} | ${gzipHeader}`);
		console.log(
			'─'.repeat(maxNameLength) +
				'─┼─' +
				'─'.repeat(maxSizeLength) +
				'─┼─' +
				'─'.repeat(10)
		);

		// Print each artifact
		for (const artifact of sortedArtifacts) {
			const name = artifact.name.padEnd(maxNameLength);
			const size = formatBytes(artifact.size).padStart(maxSizeLength);
			const gzipSize = formatBytes(artifact.gzipSize);
			console.log(`${name} | ${size} | ${gzipSize}`);
		}

		// Calculate totals
		const totalSize = builtArtifacts.reduce((sum, a) => sum + a.size, 0);
		const totalGzipSize = builtArtifacts.reduce(
			(sum, a) => sum + a.gzipSize,
			0
		);

		console.log('─'.repeat(80));
		const totalName = 'TOTAL'.padEnd(maxNameLength);
		const totalSizeFormatted = formatBytes(totalSize).padStart(maxSizeLength);
		const totalGzipFormatted = formatBytes(totalGzipSize);
		console.log(`${totalName} | ${totalSizeFormatted} | ${totalGzipFormatted}`);
	}

	if (failed > 0) {
		process.exit(1);
	}
}

// Run the build if this script is executed directly
// @ts-expect-error
if (import.meta.url === `file://${process.argv[1]}`) {
	build().catch(error => {
		console.error('❌ Build failed:', error);
		process.exit(1);
	});
}

export { build, buildPackage };
