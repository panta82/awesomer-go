/**
 * @param {App} app
 */
function createGitHubClient(app) {
	const log = app.logger.for('GitHubClient');

	return /** @lends {GitHubClient.prototype} */ {
		getRepositoryProfile,
	};

	function getRepositoryProfile() {}
}

module.exports = {
	createGitHubClient,
};
