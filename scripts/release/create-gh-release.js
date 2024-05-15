/**
 * @typedef {import('@octokit/openapi-types').components["schemas"]["release"]} Release
 *
 * @typedef Params
 * @property {ReturnType<typeof import("@actions/github").getOctokit>} github
 * @property {typeof import("@actions/github").context} context
 *
 * @param {Params} params
 * @returns {Promise<Release>}
 */
async function create({ github, context }) {
	const commitSha = process.env.GITHUB_SHA;
	const tag_name = process.env.GITHUB_REF_NAME;
	console.log('tag:', tag_name);

	let releaseResult;

	let releasePages = github.paginate.iterator(
		github.rest.repos.listReleases,
		context.repo
	);

	for await (const page of releasePages) {
		for (let release of page.data) {
			if (release.tag_name == tag_name) {
				console.log('Existing release found:', release);
				releaseResult = release;
				break;
			}
		}
	}

	if (!releaseResult) {
		console.log('No existing release found. Creating a new draft...');

		// No existing release for this tag found so let's create a release
		// API Documentation: https://docs.github.com/en/rest/reference/repos#create-a-release
		// Octokit Documentation: https://octokit.github.io/rest.js/v18#repos-create-release
		const createReleaseRes = await github.rest.repos.createRelease({
			...context.repo,
			tag_name,
			name: tag_name,
			body: '', // TODO: Maybe run changelogged and prefill the body?
			draft: true,
			prerelease: tag_name.includes('-'),
			target_commitish: commitSha
		});

		console.log('Created release:', createReleaseRes.data);
		releaseResult = createReleaseRes.data;
	} else if (!releaseResult.draft) {
		console.error('Found existing release but it was not in draft mode');
		process.exit(1);
	}

	return releaseResult;
}

module.exports = create;
