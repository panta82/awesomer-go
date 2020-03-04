const assert = require('assert');

const axios = require('axios').default;
const cheerio = require('cheerio');

const { AwesomerGoRepo } = require('./awesomer_go_types');

const SCORES = {
	nameMatchExactWord: 100,
	nameMatchCaseInsensitiveWord: 80,
	nameMatchExact: 50,
	nameMatchCaseInsensitive: 30,
	nameMatchFuzzy: 10,
	positionTop: 10,
	positionBottom: 10,
	repetitionMin: 0.1,
	repetitionMax: 2,
};

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
		const els = dom('a').toArray();

		/**
		 * @type {Map<string, {repo: AwesomerGoRepo, nameMatchScore, positionScore, repetitionScore, repetitions}>}
		 */
		const linkMap = new Map();

		let positionScore = 0;
		for (let index = 0; index < els.length; index++) {
			const url = els[index].attribs && els[index].attribs.href;
			if (!url) {
				continue;
			}

			const repo = AwesomerGoRepo.guessFromURL(url);
			if (!repo) {
				// No repo detected, we don't care about this link
				continue;
			}

			const canonicalUrl = repo.canonicalUrl;

			// Positional score will be assigned based on relative position of this URL among all other URL-s on page,
			// on scale 10..0..10, from start to end.
			// The idea is that a link in a header or a footer is more likely to be the one we want than a link in the
			// middle of the page.
			let positionScore;
			if (index > els.length / 2) {
				// 0..10
				positionScore = ((index - els.length / 2) * SCORES.positionBottom) / (els.length / 2);
			} else {
				// 10..0
				positionScore = SCORES.positionTop - (index * SCORES.positionTop) / (els.length / 2);
			}

			// Instance score is derived by scaling positionScore
			const repetitionScore =
				(positionScore / Math.max(SCORES.positionBottom, SCORES.positionTop)) *
					(SCORES.repetitionMax - SCORES.repetitionMin) +
				SCORES.repetitionMin;

			const existing = linkMap.get(canonicalUrl);
			if (existing) {
				// Update existing
				existing.positionScore = Math.max(existing.positionScore, positionScore);
				existing.repetitionScore += repetitionScore;
				existing.repetitions++;
				continue;
			}

			// There is no existing, have to add new one

			// If we are given project name, make sure the url contains it, or something like it
			let nameMatchScore = 0;
			if (name) {
				const wordRegex = `\\b${name}\\b`;
				if (new RegExp(wordRegex).test(canonicalUrl)) {
					nameMatchScore = SCORES.nameMatchExactWord;
				} else if (new RegExp(wordRegex, 'i').test(canonicalUrl)) {
					nameMatchScore = SCORES.nameMatchCaseInsensitiveWord;
				} else if (canonicalUrl.includes(name)) {
					nameMatchScore = SCORES.nameMatchExact;
				} else if (canonicalUrl.toLowerCase().includes(name.toLowerCase())) {
					nameMatchScore = SCORES.nameMatchCaseInsensitive;
				} else {
					const nameParts = name.split(/[^0-9a-zA-Z]+/g);
					if (new RegExp(nameParts.join('.*'), 'i').test(canonicalUrl)) {
						// Fuzzy match
						nameMatchScore = SCORES.nameMatchFuzzy;
					} else {
						// No match. Skip this url
						continue;
					}
				}
			}

			linkMap.set(canonicalUrl, {
				repo,
				repetitionScore,
				positionScore,
				nameMatchScore,
				repetitions: 1,
			});
		}

		const links = Array.from(linkMap.values());

		// Sort by highest score first
		links.sort(
			(a, b) =>
				b.positionScore +
				b.nameMatchScore +
				b.repetitionScore -
				(a.positionScore + a.nameMatchScore + a.repetitionScore)
		);

		// Strip away metadata
		return links.map(link => link.repo);
	}
}

module.exports = {
	createRepoFinder,
};
