# Contributing

## Releasing Preact

This guide is intended for core team members that have the necessary
rights to publish new releases on npm.

1. [Write the release notes](#writing-release-notes) and keep them as a draft in GitHub
   1. I'd recommend writing them in an offline editor because each edit to a draft will change the URL in GitHub.
2. Make a PR where **only** the version number is incremented in `package.json` (note: We follow `SemVer` conventions)
3. Wait until the PR is approved and merged.
4. Switch back to the `master` branch and pull the merged PR
5. Run `npm run build && npm publish`
   1. Make sure you have 2FA enabled in npm, otherwise the above command will fail.
   2. If you're doing a pre-release add `--tag next` to the `npm publish` command to publish it under a different tag (default is `latest`)
6. Publish the release notes and create the correct git tag.
7. Tweet it out

## Legacy Releases (8.x)

> **ATTENTION:** Make sure that you've cleared the project correctly
> when switching from a 10.x branch.

0. Run `rm -rf dist node_modules && npm i` to make sure to have the correct dependencies.

Apart from that it's the same as above.

## Writing release notes

The release notes have become a sort of tiny blog post about what's
happening in preact-land. The title usually has this format:

```txt
Version Name
```

Example:

```txt
10.0.0-beta.1 Los Compresseros
```

The name is optional, we just have fun finding creative names :wink:

To keep them interesting we try to be as
concise as possible and to just reflect where we are. There are some
rules we follow while writing them:

- Be nice, use a positive tone. Avoid negative words
- Show, don't just tell.
- Be honest.
- Don't write too much, keep it simple and short.
- Avoid making promises and don't overpromise. That leads to unhappy users
- Avoid framework comparisons if possible
- Highlight awesome community contributions (or great issue reports)
- If in doubt, praise the users.

After this section we typically follow with a changelog part that's
divided into 4 groups in order of importance for the user:

- Features
- Bug Fixes
- Typings
- Maintenance

We generate it via this handy cli program: [changelogged](https://github.com/marvinhagemeister/changelogged). It will collect and format
the descriptions of all PRs that have been merged between two tags.
The usual command is `changelogged 10.0.0-rc.2..HEAD` similar to how
you'd diff two points in time with git. This will get you 90% there,
but you still need to divide it into groups. It's also a good idea
to unify the formatting of the descriptions, so that they're easier
to read and don't look like a mess.
