import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { repoRoot } from '../../scripts/utils.js';

// @ts-ignore
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Support installing a local build from either a tarball (preact-local.tgz) or
 * from the root package.json. If preact-local.tgz exists, update
 * preact-local-proxy's package.json to point to that tarball. If it does not,
 * then leave preact-local-proxy package.json unmodified, which by default
 * points to the repo root package.json.
 *
 * This feature is necessary to support our CI benchmarks. To avoid rebuilding
 * the repo in every benchmark, we copy the prebuilt .tgz file to each job and
 * use that to avoid rebuilding. See preactjs/preact#3777 for the motivation.
 */
export async function preinstall(
	pkgRoot = (...args) => path.join(__dirname, ...args),
	prefix = `[preact-local preinstall] `,
	preactLocalTgz = repoRoot('preact-local.tgz')
) {
	console.log(`${prefix}Searching for preact-local.tgz at ${preactLocalTgz}`);
	if (existsSync(preactLocalTgz)) {
		console.log(
			`${prefix}preact-local.tgz found! Updating preact-local-proxy/package.json to install that tarball`
		);

		const pkgJsonPath = pkgRoot('package.json');
		const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8'));
		pkgJson.dependencies.preact =
			'file:' + path.relative(pkgRoot(), preactLocalTgz);

		await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2), 'utf8');
	} else {
		console.log(
			`${prefix}preact-local.tgz not found. Leaving preact-local-proxy/package.json unmodified`
		);
	}
}

export async function postinstall(
	pkgRoot = (...args) => path.join(__dirname, ...args),
	prefix = `[preact-local postinstall] `
) {
	const pkgJsonPath = pkgRoot('package.json');
	const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8'));

	const localBuild = 'file:../../../';
	if (pkgJson.dependencies.preact !== localBuild) {
		console.log(
			`${prefix}Resetting preact dep back to local build (${localBuild}) from "${pkgJson.dependencies.preact}" now that bench install is done.`
		);
		pkgJson.dependencies.preact = localBuild;
	}

	await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2), 'utf8');
}
