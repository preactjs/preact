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
 * Parse HTTP Link headers into an array of [rel_name, uri] tuples.
 * This implementation only looks for one parameter named "rel".
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link
 * @param {string} linkHeader
 * @returns {Array<[string, string]>}
 */
function parseLinkHeader(linkHeader) {
	log.debug('raw link:', linkHeader);

	/** @type {Array<[string, string]>} */
	const result = [];
	const uris = linkHeader.split(/,\s*</);

	for (let uri of uris) {
		// We assume each link uri only has one param and the param key is "rel"
		// The first "<" may get stripped off by the split call above
		const match = uri.match(/<?([^>]*)>\s*;\s*rel="?([^"]*)"?/);

		// 1st group: URI, 2nd group: rel name
		result.push([match[2], match[1]]);
	}

	log.debug('parsed:', result);
	return result;
}

/**
 * AsyncGenerator for all GitHub releases in this repo, yielding each page of results
 * @typedef {import('@octokit/openapi-types').components["schemas"]["release"]} Release
 * @returns {AsyncGenerator<Release[]>}
 */
async function* getReleases() {
	let nextUrl = 'https://api.github.com/repos/preactjs/preact/releases';
	while (nextUrl) {
		log.debug('Fetching', nextUrl);

		const response = await fetch(nextUrl);
		const linkHeader = response.headers.get('Link');
		const links = linkHeader ? parseLinkHeader(linkHeader) : null;

		nextUrl = links?.find(link => link[0] == 'next')?.[1];
		yield /** @type {Release[]} */ (await response.json());
	}
}

async function main(tag, opts) {
	DEBUG = opts.debug;

	log.debug('Git tag:', tag);
	log.debug('Options:', opts);

	// 1. Find a release with the matching tag
	/** @type {Release} */
	let release;

	for await (let releasePage of getReleases()) {
		release = releasePage.find(release => release.tag_name == tag);
		if (release) {
			break;
		}
	}

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
