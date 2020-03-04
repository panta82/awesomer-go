const AWESOMER_GO_REPO_TYPES = {
	github: 'github',
};

class AwesomerGoData {
	constructor(/** AwesomerGoData */ source) {
		/**
		 * List of projects
		 * @type {AwesomerGoProject[]}
		 */
		this.projects = undefined;

		/**
		 * Date when this data was generated
		 * @type {Date}
		 */
		this.timestamp = undefined;

		Object.assign(this, source);
	}
}

class AwesomerGoProject {
	constructor(/** AwesomerGoProject */ source) {
		/**
		 * Original index on the awesomego list
		 * @type {number}
		 */
		this.index = undefined;

		/**
		 * Link to the project repo or website
		 * @type {string}
		 */
		this.url = undefined;

		/**
		 * Project title
		 * @type {string}
		 */
		this.title = undefined;

		/**
		 * Description from awesomego repo
		 * @type {string}
		 */
		this.description = undefined;

		/**
		 * Main project category
		 * @type {string}
		 */
		this.category = undefined;

		/**
		 * Project subcategory, optional
		 * @type {string}
		 */
		this.subcategory = undefined;

		/**
		 * Detected repository for this project
		 * @type {AwesomerGoRepo}
		 */
		this.repo = undefined;

		/**
		 * When was the project created
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

		/**
		 * When was repository data loaded
		 * @type {Date}
		 */
		this.repository_data_timestamp = undefined;

		Object.assign(this, source);
	}
}

class AwesomerGoRepo {
	constructor(/** AwesomerGoRepo */ source) {
		/**
		 * Type of the repo, one of AWESOMER_GO_REPO_TYPES
		 * @type {string}
		 */
		this.type = undefined;

		/**
		 * Repo owner
		 * @type {string}
		 */
		this.owner = undefined;

		/**
		 * Repo name
		 * @type {string}
		 */
		this.name = undefined;

		Object.assign(this, source);
	}

	static guessFromURL(url) {
		const githubMatch = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?/.exec(url);
		if (githubMatch) {
			// Direct match! Easy.
			return new AwesomerGoRepo({
				owner: githubMatch[1],
				name: githubMatch[2],
				type: AWESOMER_GO_REPO_TYPES.github,
			});
		}

		// TODO Add other providers

		return null;
	}

	get canonicalUrl() {
		switch (this.type) {
			case AWESOMER_GO_REPO_TYPES.github:
				return `https://github.com/${this.owner}/${this.name}`;
		}

		throw new Error(`Unsupported repo type: ${this.type}`);
	}
}

module.exports = {
	AWESOMER_GO_REPO_TYPES,

	AwesomerGoData,
	AwesomerGoProject,
	AwesomerGoRepo,
};
