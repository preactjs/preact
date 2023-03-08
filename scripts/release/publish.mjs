import { execFileSync } from 'child_process';
import fs from 'fs';
import { fetch, stream } from 'undici';
import sade from 'sade';

let DEBUG = false;
const log = {
	debug: (...msgs) => DEBUG && console.log(...msgs),
	info: (...msgs) => console.log(...msgs),
	error: (...msgs) => console.error(...msgs)
};

/**
 * @typedef {import('@octokit/openapi-types').components["schemas"]["release"]} Release
 * @param {string} tag
 * @param {any} opts
 */
async function main(tag, opts) {
	DEBUG = opts.debug;

	log.debug('Git tag:', tag);
	log.debug('Options:', opts);

	// 1. Find a release with the matching tag
	const getReleaseByTagUrl = `https://api.github.com/repos/preactjs/preact/releases/tags/${tag}`;
	const response = await fetch(getReleaseByTagUrl);
	if (response.status == 404) {
		log.error(
			`Could not find the GitHub release for tag ${tag}. Has the release workflow finished and the GitHub release published?`
		);
		process.exit(1);
	} else if (!response.ok) {
		log.error('GitHub API returned an error:');
		log.error(`${response.status} ${response.statusText}`);
		log.error(await response.text());
		process.exit(1);
	}

	const release = /** @type {Release} */ (await response.json());
	log.debug('Release:', release);
	if (release) {
		log.info('Found release', release.id, 'at', release.html_url);
	} else {
		log.error(
			`Could not find a release with the tag ${tag}. Please publish that tag, wait for the release workflow to complete. Then publish the release, and re-run this script.`
		);
		process.exit(1);
	}

	// 2. Find npm package release asset
	/** @type {Release["assets"][0]} */
	let packageAsset = null;
	const artifactRegex = /^preact-.+\.tgz$/;
	for (let asset of release.assets) {
		if (artifactRegex.test(asset.name)) {
			packageAsset = asset;
		}
	}

	if (packageAsset) {
		log.info(`Found npm package asset: ${packageAsset.name}`);
	} else {
		log.error(
			'Could not find asset matching package regex:',
			artifactRegex,
			'\nPlease wait for release workflow to complete and upload npm package.'
		);
		process.exit(1);
	}

	// 3. Download release asset
	log.info(`\nDownloading ${packageAsset.name}...`);
	await stream(
		packageAsset.browser_download_url,
		{
			method: 'GET',
			maxRedirections: 30
		},
		() => fs.createWriteStream(packageAsset.name)
	);

	// 3. Run npm publish
	const args = ['publish', packageAsset.name];
	if (opts['npm-tag']) {
		args.push('--tag', opts['npm-tag']);
	}

	log.info(`Executing \`npm ${args.join(' ')}\``);
	if (!opts['dry-run']) {
		execFileSync('npm', args, { encoding: 'utf8', stdio: 'inherit' });
	}
}

sade('publish <git-tag>', true)
	.describe('Publish a tagged version of this package')
	.option('--npm-tag', 'The npm tag to publish this package under', '')
	.option(
		'--dry-run',
		"Prepare the package for publishing but don't actually publish it",
		false
	)
	.option('--debug -d', 'Log debugging information', false)
	.action(main)
	.parse(process.argv);
