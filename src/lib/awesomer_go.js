/**
 * @param {App} app
 */
function createAwesomerGoGenerator(app) {
	const log = app.logger.for('AwesomerGoGenerator');

	return /** @lends {AwesomerGoGenerator.prototype} */ {
		generate,
	};

	/**
	 * @param sourceData
	 * @return {Array<AwesomerGoProject>}
	 */
	function generateProjects(/** AwesomeGoData */ sourceData) {
		const items = [];

		for (const topSection of sourceData.sections) {
			gatherFromSection(topSection);
		}

		return items;

		function gatherFromSection(/** AwesomeGoSection */ section, parentCategory = null) {
			if (section.group && section.group !== 'Awesome Go') {
				// We only care for the awesome go group and its subgroups
				return;
			}

			for (const link of section.links) {
				items.push(
					new AwesomerGoProject({
						title: link.title,
						description: link.description,
						href: link.href,
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

	async function generate() {
		const sourceData = await app.awesomeGoClient.getData();
		const projects = generateProjects(sourceData);
		return projects;
	}

	/**
	 * Try to detect github owner and repo from given url
	 * @return {Promise<{owner, repo}>}
	 */
	async function urlToGithubRepo(url) {
		const directMatch = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/.exec(url);
		if (directMatch) {
			// Direct match! Easy.
			return { owner: directMatch[1], repo: directMatch[2] };
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
		this.href = undefined;

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

		Object.assign(this, source);
	}
}

module.exports = {
	createAwesomerGoGenerator,
};
