import { fileURLToPath } from 'url';
import { stat, readFile } from 'fs/promises';
import * as path from 'path';
import escalade from 'escalade';
import globby from 'globby';

// TODO: Replace with import.meta.resolve when stable
import { createRequire } from 'module';
// @ts-ignore
const require = createRequire(import.meta.url);

export const IS_CI = process.env.CI === 'true';

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = (...args) => path.join(__dirname, '..', '..', ...args);
export const benchesRoot = (...args) => repoRoot('benches', ...args);
export const resultsPath = (...args) => benchesRoot('results', ...args);

export const toUrl = str => str.replace(/^[A-Za-z]+:/, '/').replace(/\\/g, '/');

export const allBenches = '**/*.html';
export function globSrc(patterns) {
	return globby(patterns, { cwd: benchesRoot('src') });
}

export async function getPkgBinPath(pkgName) {
	/** @type {string | void} */
	let packageJsonPath;
	try {
		// TODO: Replace with import.meta.resolve when stable
		const pkgMainPath = require.resolve(pkgName);
		packageJsonPath = await escalade(pkgMainPath, (dir, names) => {
			if (names.includes('package.json')) {
				return 'package.json';
			}
		});
	} catch (e) {
		// Tachometer doesn't have a valid 'main' entry
		packageJsonPath = benchesRoot('node_modules', pkgName, 'package.json');
	}

	if (!packageJsonPath || !(await stat(packageJsonPath)).isFile()) {
		throw new Error(
			`Could not locate "${pkgName}" package.json at "${packageJsonPath}".`
		);
	}

	const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
	if (!pkg.bin) {
		throw new Error(`${pkgName} package.json does not contain a "bin" entry.`);
	}

	let binSubPath = pkg.bin;
	if (typeof pkg.bin == 'object') {
		binSubPath = pkg.bin[pkgName];
	}

	const binPath = path.join(path.dirname(packageJsonPath), binSubPath);
	if (!(await stat(binPath)).isFile()) {
		throw new Error(`Bin path for ${pkgName} is not a file: ${binPath}`);
	}

	return binPath;
}
