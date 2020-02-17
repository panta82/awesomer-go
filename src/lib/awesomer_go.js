const fs = require('fs');
const { promisify } = require('util');

const { promiseChain } = require('./tools');

/**
 * @param {App} app
 */
function createAwesomerGoGenerator(app) {
	const log = app.logger.for('AwesomerGoGenerator');

	return /** @lends {AwesomerGoGenerator.prototype} */ {
		generate,
		generateJSON,
		generateIntoAJSONFile,
	};

	async function generate() {
		log.info(`Generating AwesomerGo data...`);

		const sourceData = await app.awesomeGoClient.getData();
		const projects = generateProjects(sourceData);

		log.info(`${projects.length} projects generated. Fetching additional details...`);

		await promiseChain(projects, project => mutateProjectFillingInDetails(project), 10);

		log.info(`${projects.length} project details loaded.`);

		return projects;
	}

	async function generateJSON() {
		const data = await generate();
		const json = JSON.stringify(data, null, '  ');
		return json;
	}

	async function generateIntoAJSONFile(targetPath) {
		const json = await generateJSON();

		log.info(`Writing data as JSON into "${targetPath}"...`);
		await promisify(fs.writeFile)(targetPath, json, 'utf8');

		log.info(`Data written.`);
		return true;
	}

	/**
	 * @param sourceData
	 * @return {Array<AwesomerGoProject>}
	 */
	function generateProjects(/** AwesomeGoData */ sourceData) {
		const projects = [];

		for (const topSection of sourceData.sections) {
			gatherFromSection(topSection);
		}

		return projects;

		function gatherFromSection(/** AwesomeGoSection */ section, parentCategory = null) {
			if (section.group && section.group !== 'Awesome Go') {
				// We only care for the awesome go group and its subgroups
				return;
			}

			for (const link of section.links) {
				projects.push(
					new AwesomerGoProject({
						title: link.title,
						description: link.description,
						url: link.href,
						category: parentCategory || section.title,
						subcategory: parentCategory ? section.title : undefined,
					})
				);
			}

			if (section.subsections) {
				for (const subsection of section.subsections) {
					gatherFromSection(subsection, parentCategory || section.title);
				}
			}
		}
	}

	async function mutateProjectFillingInDetails(/** AwesomerGoProject */ project) {
		project.repo = await determineRepo(project.url);

		if (project.repo) {
			switch (project.repo.type) {
				case AWESOMER_GO_REPO_TYPES.github: {
					log.verbose(
						`Loading details for "${project.title}" from github (${project.repo.owner}/${project.repo.name})...`
					);

					const profile = await app.githubClient.getRepositoryProfile(
						project.repo.owner,
						project.repo.name
					);
					project.created_at = profile.created_at;
					project.last_commit_at = profile.last_commit_at;
					project.stars = profile.stars;
					project.forks = profile.forks;
					project.subscribers = profile.subscribers;
					project.license = profile.license;
				}
			}
		}
	}

	/**
	 * Try to detect repository based on given URL
	 * @return {Promise<AwesomerGoRepo>}
	 */
	async function determineRepo(url) {
		const directGHMatch = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/.exec(url);
		if (directGHMatch) {
			// Direct match! Easy.
			return new AwesomerGoRepo({
				owner: directGHMatch[1],
				name: directGHMatch[2],
				type: AWESOMER_GO_REPO_TYPES.github,
			});
		}

		// TODO: Try to get it from their website

		return null;
	}
}

class AwesomerGoProject {
	constructor(/** AwesomerGoProject */ source) {
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

		Object.assign(this, source);
	}
}

const AWESOMER_GO_REPO_TYPES = {
	github: 'github',
};

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
}

module.exports = {
	createAwesomerGoGenerator,
};
