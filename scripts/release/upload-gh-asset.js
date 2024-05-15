/**
 * @typedef {import('@octokit/openapi-types').components["schemas"]["release"]} Release
 *
 * @typedef Params
 * @property {typeof require} require
 * @property {ReturnType<typeof import("@actions/github").getOctokit>} github
 * @property {typeof import("@actions/github").context} context
 * @property {typeof import("@actions/glob")} glob
 * @property {Release} release
 *
 * @param {Params} params
 */
async function upload({ require, github, context, glob, release }) {
	const fs = require('fs');

	// Find artifact to upload
	const artifactPattern = 'preact.tgz';
	const globber = await glob.create(artifactPattern, {
		matchDirectories: false
	});

	const results = await globber.glob();
	if (results.length == 0) {
		throw new Error(
			`No release artifact found matching pattern: ${artifactPattern}`
		);
	} else if (results.length > 1) {
		throw new Error(
			`More than one artifact matching pattern found. Expected only one. Found ${results.length}.`
		);
	}

	const assetPath = results[0];
	const assetName = `preact-${release.tag_name.replace(/^v/, '')}.tgz`;
	const assetRegex = /^preact-.+\.tgz$/;

	for (let asset of release.assets) {
		if (assetRegex.test(asset.name)) {
			console.log(
				`Found existing asset matching asset pattern: ${asset.name}. Removing...`
			);
			await github.rest.repos.deleteReleaseAsset({
				...context.repo,
				asset_id: asset.id
			});
		}
	}

	console.log(`Uploading ${assetName} from ${assetPath}...`);

	// Upload a release asset
	// API Documentation: https://docs.github.com/en/rest/reference/repos#upload-a-release-asset
	// Octokit Documentation: https://octokit.github.io/rest.js/v18#repos-upload-release-asset
	const uploadAssetResponse = await github.rest.repos.uploadReleaseAsset({
		...context.repo,
		release_id: release.id,
		name: assetName,
		data: fs.readFileSync(assetPath)
	});

	console.log('Asset:', uploadAssetResponse.data);
	return uploadAssetResponse.data;
}

module.exports = upload;
