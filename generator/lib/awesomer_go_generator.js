const fs = require('fs');
const { promisify } = require('util');

const { promiseChain } = require('./tools');
const {
	AWESOMER_GO_REPO_TYPES,
	AwesomerGoData,
	AwesomerGoProject,
	AwesomerGoRepo,
} = require('./awesomer_go_types');

const OUTPUT_FORMATS = {
	json: 'json',
	jsonp: 'jsonp',
};

/**
 * @param {App} app
 */
function createAwesomerGoGenerator(app) {
	const log = app.logger.for('AwesomerGoGenerator');

	return /** @lends {AwesomerGoGenerator.prototype} */ {
		generate,
		generateFormatted,
		generateIntoAFile,
	};

	async function generate(fallbackData = undefined, projectFilter = undefined) {
		const timestamp = new Date();
		log.info(
			`Generating AwesomerGo data for ${timestamp.toISOString()}${
				fallbackData ? ' with fallback data provided' : ''
			}${projectFilter ? ` filtered to project "${projectFilter}"` : ''}...`
		);

		const sourceData = await app.awesomeGoClient.getData();
		let projects = generateProjects(sourceData);

		if (projectFilter) {
			log.verbose(`${projects.length} projects found. Filtering...`);
			projects = projects.filter(p => p.title.toLowerCase().includes(projectFilter.toLowerCase()));
		}

		log.info(`${projects.length} projects generated. Fetching additional details...`);

		await promiseChain(
			projects,
			project => mutateProjectFillingInDetails(project, fallbackData),
			20
		);

		log.info(`${projects.length} project details loaded.`);

		return new AwesomerGoData({
			projects,
			timestamp,
		});
	}

	async function loadFallbackData(fallbackDataPath) {
		let fallbackDataStr = await promisify(fs.readFile)(fallbackDataPath, 'utf8');
		const jsonpPrefix = `${app.settings.jsonpVariable} = `;
		if (fallbackDataStr.indexOf(jsonpPrefix) === 0) {
			// Strip away JSONP stuff
			fallbackDataStr = fallbackDataStr.slice(jsonpPrefix.length, -1);
		}

		let fallbackData = undefined;
		try {
			fallbackData = JSON.parse(fallbackDataStr);
		} catch (err) {
			throw new Error(`Invalid format of fallback data at "${fallbackDataPath}": ${err.message}`);
		}

		fallbackData = new AwesomerGoData(fallbackData);
		fallbackData.projects = (fallbackData.projects || []).map(p => new AwesomerGoProject(p));
		return fallbackData;
	}

	async function generateFormatted(
		format,
		fallbackDataPath = undefined,
		projectFilter = undefined
	) {
		if (!OUTPUT_FORMATS[format]) {
			throw new Error(`Unknown format: "${format}"`);
		}

		const fallbackData = fallbackDataPath ? await loadFallbackData(fallbackDataPath) : null;

		const data = await generate(fallbackData, projectFilter);

		let result = JSON.stringify(data, null, '  ');
		if (format === OUTPUT_FORMATS.jsonp) {
			result = `${app.settings.jsonpVariable} = ${result};`;
		}
		return result;
	}

	async function generateIntoAFile(
		targetPath,
		format,
		fallbackDataPath = undefined,
		projectFilter = undefined
	) {
		const content = await generateFormatted(format, fallbackDataPath, projectFilter);

		log.info(`Writing data as ${format} into "${targetPath}"...`);
		await promisify(fs.writeFile)(targetPath, content, 'utf8');

		log.info(`Data written.`);
		return true;
	}

	/**
	 * @param sourceData
	 * @return {Array<AwesomerGoProject>}
	 */
	function generateProjects(/** AwesomeGoData */ sourceData) {
		const projects = [];
		let lastIndex = 0;

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
						index: ++lastIndex,
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

	async function mutateProjectFillingInDetails(
		/** AwesomerGoProject */ project,
		/** AwesomerGoData */ fallbackData
	) {
		try {
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
						project.repository_data_timestamp = new Date();
					}
				}
			}
		} catch (err) {
			if (!fallbackData) {
				// Just error out
				throw err;
			}

			// Try to fall back to an earlier version of this project
			const fallbackProject = fallbackData.projects.find(p => p.title === project.title);
			if (!fallbackProject) {
				// No fallback found. Error out.
				throw err;
			}

			// Use data from previous version of this project
			Object.assign(project, fallbackProject);
			log.error(`Failed to load details for "${project.title}"`, err);
			log.warn(
				`For project "${project.title}", we will fall back to the repository data we've obtained at ${project.repository_data_timestamp}`
			);
		}
	}

	/**
	 * Try to detect repository based on given URL
	 * @return {Promise<AwesomerGoRepo>}
	 */
	async function determineRepo(url) {
		const repo = AwesomerGoRepo.guessFromURL(url);
		if (repo) {
			// We have the repo
			return repo;
		}

		// TODO: Try to get it from their website

		return null;
	}
}

module.exports = {
	createAwesomerGoGenerator,

	OUTPUT_FORMATS,
};
