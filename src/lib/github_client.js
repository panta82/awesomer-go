const axios = require('axios').default;

const GITHUB_API_URL = `https://api.github.com`;

const METHODS = {
	get: 'get',
};

class GithubResponseError extends Error {
	constructor(source, status) {
		super(`Github request error: ${source.message || source}`);
		this.status = status;
		Object.defineProperty(this, 'message', {
			enumerable: true,
		});
		for (const key in source) {
			if (key !== 'message') {
				this[key] = source[key];
			}
		}
	}
}

/**
 * @param {App} app
 */
function createGitHubClient(app) {
	const log = app.logger.for('GitHubClient');

	return /** @lends {GitHubClient.prototype} */ {
		getRepositoryProfile,
		getRepository,
	};

	async function makeRequest(method, path) {
		try {
			const resp = await axios(`${GITHUB_API_URL}${path}`, {
				method,
				headers: {
					Accept: 'application/vnd.github.v3+json',
				},
				auth: {
					username: app.settings.githubClientId,
					password: app.settings.githubClientSecret,
				},
			});
			return resp.data;
		} catch (err) {
			if (err.response) {
				throw new GithubResponseError(err.response.data, err.response.status);
			}
			log.error(err);
			throw new Error(`Failed to reach GitHub server: ${err.message}`);
		}
	}

	function getRepositoryProfile() {}

	async function getRepository(owner, repo) {
		const data = await makeRequest(METHODS.get, `/repos/${owner}/${repo}`);
		return new GithubRepository(data);
	}
}

class GithubRepository {
	constructor(source) {
		Object.assign(this, source);
	}
}

module.exports = {
	createGitHubClient,
};
