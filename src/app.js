function App(settings) {
	/** @type {Settings} */
	this.settings = settings;

	/** @type {MayanLogger} */
	this.logger = new (require('mayan-logger').MayanLogger)({});

	/** @type {MayanLogCollector} */
	this.log = this.logger.log;

	/** @type {AwesomeGoClient} */
	this.awesomeGoClient = require('./lib/awesome_go').createAwesomeGoClient(this);

	/** @type {GitHubClient} */
	this.githubClient = require('./lib/github_client').createGitHubClient(this);
}

module.exports = {
	App,
};
