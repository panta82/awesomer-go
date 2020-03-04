const assert = require('assert');

const axios = require('axios').default;
const cheerio = require('cheerio');

/**
 * @param {App} app
 */
function createRepoFinder(app) {
	const log = app.logger.for('RepoFinder');

	return /** @lends {RepoFinder.prototype} */ {
		findRepos,
	};

	/**
	 * @param {string} url
	 * @param {string} name This name will be used to narrow down repos to just a particular project
	 * @return {Promise<AwesomerGoRepo[]>}
	 */
	async function findRepos(url, name = undefined) {
		assert.ok(url, 'url must be provided');
		const reportingName = name ? `"${name}"` : '<unspecified>';

		let html;
		try {
			const response = await axios.get(url, {
				headers: {
					accept: 'text/html',
				},
			});
			const contentType = response.headers['content-type'];
			if (!(contentType || '').includes('text/html')) {
				log.warn(`Unsupported content type on URL "${url}": ${contentType}`);
				return false;
			}

			html = response.data;
		} catch (err) {
			log.error(`Failed to load project ${reportingName}'s website at "${url}"`, err);
			return false;
		}

		let dom;
		try {
			dom = cheerio.load(html);
		} catch (err) {
			log.error(`Failed to parse HTML from project ${reportingName}'s website at "${url}"`, err);
			return false;
		}

		const redirectUrl = detectRedirect(dom);
		if (redirectUrl) {
			log.verbose(
				`Website at "${url}" for project ${reportingName} redirects to "${redirectUrl}". Following...`
			);
			return findRepos(redirectUrl, name);
		}

		return findReposInDOM(name, dom);
	}

	/**
	 * @param {CheerioStatic} dom
	 * @return {string|null}
	 */
	function detectRedirect(dom) {
		const refreshMetas = dom('meta[http-equiv="refresh"]').toArray();
		for (const meta of refreshMetas) {
			const content = meta.attribs['content'];
			if (content) {
				const urlMatch = /;\s*url\s*=\s*(\S+)\s*$/i.exec(content);
				if (urlMatch) {
					// We found a redirect url
					return urlMatch[1];
				}
			}
		}

		// Nothing found
		return null;
	}

	/**
	 * @param {string} name
	 * @param {CheerioStatic} dom
	 * @return {AwesomerGoRepo[]}
	 */
	function findReposInDOM(name, dom) {
		// Find all the links
		dom('a').each((index, el) => {
			const url = el.attribs && el.attribs.href;
			console.log(index, url);
		});
	}
}

module.exports = {
	createRepoFinder,
};
