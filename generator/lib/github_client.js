const fs = require('fs');
const libPath = require('path');
const { promisify } = require('util');

const { Octokit } = require('@octokit/rest');

/**
 * @param {App} app
 */
function createGitHubClient(app) {
	const log = app.logger.for('GitHubClient');

	const _octokit = new Octokit();
	_octokit.hook.before('request', request => {
		// NOTE: This is needed in order to make stupid GitHub not throttle requests, as seen here:
		//       https://developer.github.com/v3/#oauth2-keysecret
		//       However, stupid octokit doesn't seem to have a way to submit just these, without a full-on
		//       auth strategy. So I just add it myself.
		if (app.settings.githubClientId && app.settings.githubClientSecret) {
			const hash = Buffer.from(
				`${app.settings.githubClientId}:${app.settings.githubClientSecret}`
			).toString('base64');
			request.headers['authorization'] = `Basic ${hash}`;
		}
	});

	return /** @lends {GitHubClient.prototype} */ {
		initialize,
		getRepositoryProfile,
	};

	async function initialize() {
		if (app.settings.githubCacheDirectory) {
			log.info(`Initializing cache directory: ${app.settings.githubCacheDirectory}`);
			await promisify(fs.mkdir)(app.settings.githubCacheDirectory, {
				recursive: true,
			});
		}
	}

	async function doGetRepositoryProfile(owner, repo) {
		log.verbose(`Fetching profile for ${owner}/${repo}`);
		const repoData = await getRepository(owner, repo);
		return new GithubRepositoryProfile({
			name: repoData.name,
			owner,
			description: repoData.description,
			created_at: new Date(repoData.created_at),
			last_commit_at: new Date(repoData.pushed_at),
			stars: repoData.stargazers_count,
			forks: repoData.forks,
			subscribers: repoData.subscribers_count,
			license: repoData.license ? repoData.license.key : null,
		});
	}

	/**
	 * Get our custom "repository profile" object, with combined metrics and info about repository
	 * @return {Promise<GithubRepositoryProfile>}
	 */
	async function getRepositoryProfile(owner, repo) {
		if (!app.settings.githubCacheDirectory) {
			// Skip any caching
			return doGetRepositoryProfile(owner, repo);
		}

		const cachedPath = libPath.resolve(app.settings.githubCacheDirectory, `${owner}$${repo}.json`);

		let cachedContent = null;
		try {
			const file = await promisify(fs.readFile)(cachedPath, 'utf8');
			try {
				cachedContent = JSON.parse(file);
			} catch (err) {
				log.warn(`Invalid JSON of cached file ${cachedPath}. We will discard and fetch again`, err);
			}
		} catch (err) {
			if (err.code === 'ENOENT') {
				log.verbose(`Cache miss on ${cachedPath}`);
			} else {
				throw err;
			}
		}

		if (cachedContent) {
			// We got it cached, use that
			return new GithubRepositoryProfile(cachedContent);
		}

		// Get actual data
		const freshContent = await doGetRepositoryProfile(owner, repo);

		try {
			await promisify(fs.writeFile)(cachedPath, JSON.stringify(freshContent), 'utf8');
		} catch (err) {
			log.error(`Failed to write cache file ${cachedPath}`, err);
		}

		return freshContent;
	}

	/**
	 * @param owner
	 * @param repo
	 * @return {Promise<Octokit.ReposGetResponse>}
	 */
	async function getRepository(owner, repo) {
		return (
			await _octokit.repos.get({
				owner,
				repo,
			})
		).data;
	}
}

class GithubRepositoryProfile {
	constructor(source) {
		/**
		 * Repository name
		 */
		this.name = undefined;

		/**
		 * Repository owner
		 */
		this.owner = undefined;

		/**
		 * Repository description
		 */
		this.description = undefined;

		/**
		 * When was the repo created
		 */
		this.created_at = undefined;

		/**
		 * When was last commit pushed
		 */
		this.last_commit_at = undefined;

		/**
		 * Number of stars
		 * @type {Number}
		 */
		this.stars = undefined;

		/**
		 * Number of forks
		 * @type {Number}
		 */
		this.forks = undefined;

		/**
		 * Number of subscribers
		 * @type {Number}
		 */
		this.subscribers = undefined;

		/**
		 * The license the project uses
		 */
		this.license = undefined;

		Object.assign(this, source);
	}
}

module.exports = {
	createGitHubClient,

	GithubRepositoryProfile,
};
