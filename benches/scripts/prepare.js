import { readdir } from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';
import { deleteAsync } from 'del';
import { repoRoot } from './utils.js';
import { existsSync } from 'fs';

const npmCmd = process.platform == 'win32' ? 'npm.cmd' : 'npm';

/**
 * @param {string[]} frameworks
 */
export async function prepare(frameworks) {
	const proxyRoot = repoRoot('benches/proxy-packages');
	const proxyDirs = (await readdir(proxyRoot)).map(dirname =>
		dirname.replace(/-proxy$/, '')
	);

	for (let framework of frameworks) {
		const dirname = proxyDirs.find(dir => dir == framework);
		if (dirname == null) {
			continue;
		}

		const proxyDir = (...args) =>
			path.join(proxyRoot, dirname + '-proxy', ...args);

		const packageScripts = proxyDir('scripts.mjs');
		const hasScripts = existsSync(packageScripts);
		if (hasScripts) {
			await import(packageScripts).then(m => m.preinstall?.());
		}

		// It appears from ad-hoc testing (npm v6.14.9 on Windows), npm will cache
		// any locally referenced tarball files (e.g. "file:../../../preact.tgz") in
		// its global cache.
		//
		// If a package-lock is present and the `npm ci` or `npm i` command is used,
		// then npm will pull the tarball from the cache and not use the local
		// tarball file even if the local reference has changed or is deleted.
		//
		// Because of the above behavior, we'll always delete the package-lock file
		// and node_modules folder and use `npm i` to ensure we always get the
		// latest packages
		console.log(`Preparing ${dirname}: Cleaning ${proxyDir()}...`);
		await deleteAsync(['package-lock.json', 'node_modules'], {
			cwd: proxyDir()
		});

		console.log(`Preparing ${dirname}: Running "npm i" in ${proxyDir()}...`);
		execFileSync(npmCmd, ['i'], { cwd: proxyDir(), stdio: 'inherit' });

		if (hasScripts) {
			await import(packageScripts).then(m => m.postinstall?.());
		}
	}
}
