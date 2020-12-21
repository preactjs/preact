import { readdir } from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';
import del from 'del';
import { repoRoot } from './utils.js';

const npmCmd = process.platform == 'win32' ? 'npm.cmd' : 'npm';

/**
 * @param {TachometerOptions["framework"]} framework
 */
export async function prepare(framework) {
	const proxyRoot = repoRoot('benches/proxy-packages');
	for (let dirname of await readdir(proxyRoot)) {
		if (!framework.includes(dirname.replace(/-proxy/g, ''))) {
			continue;
		}

		const proxyDir = (...args) => path.join(proxyRoot, dirname, ...args);

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
		await del(['package-lock.json', 'node_modules'], { cwd: proxyDir() });

		console.log(`Preparing ${dirname}: Running "npm i" in ${proxyDir()}...`);
		execFileSync(npmCmd, ['i'], { cwd: proxyDir(), stdio: 'inherit' });
	}
}
