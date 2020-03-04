function App(settings) {
	/** @type {Settings} */
	this.settings = settings;

	/** @type {MayanLogger} */
	this.logger = new (require('mayan-logger').MayanLogger)({
		level: this.settings.logLevel || undefined,
	});

	/** @type {MayanLogCollector} */
	this.log = this.logger.log;

	/** @type {AwesomeGoClient} */
	this.awesomeGoClient = require('./lib/awesome_go').createAwesomeGoClient(this);

	/** @type {RepoFinder} */
	this.repoFinder = require('./lib/repo_finder').createRepoFinder(this);

	/** @type {GitHubClient} */
	this.githubClient = require('./lib/github_client').createGitHubClient(this);

	/** @type {AwesomerGoGenerator} */
	this.awesomerGoGenerator = require('./lib/awesomer_go').createAwesomerGoGenerator(this);

	this.initialize = async () => {
		await this.githubClient.initialize();
	};
}

module.exports = {
	App,
};
