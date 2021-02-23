const assert = require('assert');

const MarkdownIt = require('markdown-it');
const axios = require('axios').default;

const AWESOME_GO_URL = 'https://raw.githubusercontent.com/avelino/awesome-go/master/README.md';

/**
 * @param {App} app
 */
function createAwesomeGoClient(app) {
	const log = app.logger.for('AwesomeGoClient');

	return /** @lends {AwesomeGoClient.prototype} */ {
		_fetchRawData,
		getData,
	};

	async function _fetchRawData() {
		log.info(`Fetching awesomego data from ${AWESOME_GO_URL}...`);
		try {
			const res = await axios.get(AWESOME_GO_URL);
			return res.data;
		} catch (err) {
			log.error(err);
			throw new Error(`Failed to fetch AwesomeGo source data: ${err.message}`);
		}
	}

	/**
	 * @return {Promise<AwesomeGoData>}
	 */
	async function getData() {
		const sourceStr = await _fetchRawData();
		log.info(`Parsing awesomego data...`);
		const result = parseAwesomeGoData(sourceStr);
		log.info(
			`Parsed ${result.sections.length} sections, with ${result.sections.reduce(
				(count, section) => section.subsections.length + count,
				0
			)} subsections.`
		);
		return result;
	}
}

// *********************************************************************************************************************

/**
 * Parse awesome-go source, provided in markdown format
 * @param sourceStr
 * @return {AwesomeGoData}
 */
function parseAwesomeGoData(sourceStr) {
	const markdownIt = new MarkdownIt();
	const tokens = markdownIt.parse(sourceStr, {});

	/** @type {Array<{tag, attrs}>} */
	const tagStack = [];

	const sections = [];

	let group = null;

	/** @type {AwesomeGoLink} */
	let currentLink = null;

	/** @type {AwesomeGoSection} */
	let currentSection = null;

	/** @type {AwesomeGoSection} */
	let currentParentSection = null;

	parseTokens(tokens);

	return new AwesomeGoData({
		sourceStr,
		sections,
	});

	function parseTokens(tokens) {
		/** @type {AwesomeGoLink} */
		let linkForThisBlock;

		for (let index = 0; index < tokens.length; index++) {
			const token = tokens[index];

			if (token.type.endsWith('_open') && token.tag) {
				tagStack.push({
					tag: token.tag,
					attrs: token.attrs,
				});
			} else if (token.type.endsWith('_close') && token.tag) {
				assert.ok(tagStack.length > 0, 'there must be tags on stack when closing');
				assert.ok(
					token.tag === tagStack[tagStack.length - 1].tag,
					'closing tag must match open tag'
				);
				tagStack.pop();
			} else if (token.children) {
				// NOTE: I don't think open and close tokens have children
				parseTokens(token.children);
			}

			if (token.type === 'heading_open' && token.tag === 'h2') {
				currentSection = new AwesomeGoSection({
					group,
					links: [],
					subsections: [],
				});
				sections.push(currentSection);
				// Clear parent, we are back to the top level
				currentParentSection = null;
			} else if (token.type === 'heading_open' && token.tag === 'h3' && currentSection) {
				if (!currentParentSection) {
					// We are entering subsections
					currentParentSection = currentSection;
				}
				currentSection = new AwesomeGoSection({
					links: [],
					subsections: [],
				});
				currentParentSection.subsections.push(currentSection);
			} else if (
				token.type === 'link_open' &&
				currentSection &&
				!linkForThisBlock &&
				inTags('ul', 'li', 'p', 'a')
			) {
				// NOTE: we only parse link if it is the first link in line. Otherwise, we presume it is something like:
				//       [some-link](link) - Text text [some-other-link-in-text]() text text
				const hrefAttr = token.attrs.find(attr => attr[0] === 'href');
				if (hrefAttr) {
					const href = hrefAttr[1];
					currentLink = new AwesomeGoLink({
						href,
					});
					linkForThisBlock = currentLink;
				}
			} else if (token.type === 'link_close' && currentLink) {
				if (currentSection) {
					currentSection.links.push(currentLink);
				}
				currentLink = null;
			} else if (token.type === 'text' || token.type === 'code_inline') {
				if (inTags('h1')) {
					// Set current group
					group = token.content;
				}
				if ((inTags('h2') || inTags('h3')) && currentSection && !currentSection.title) {
					// First text in section, this is title
					if (token.content.trim() === 'Sponsorships') {
						// This is "sponsorships" section. Unfortunately, it uses the same tag as real sections, but we want to exclude it.
						// Get rid of it
						sections.pop();
						currentSection = null;
						continue;
					}
					currentSection.title = token.content;
				} else if (
					inTags('p', 'em') &&
					currentSection &&
					!currentSection.subtitle &&
					!currentSection.links.length
				) {
					// If we see a paragraph and current section doesn't have subtitle and it doesn't have links yet,
					// presume we are seeing subtitle
					currentSection.subtitle = token.content;
				} else if (inTags('a') && currentLink && !currentLink.title) {
					// We are reading a link
					currentLink.title = token.content;
				} else if (linkForThisBlock && (inTags('ul', 'li', 'p') || inTags('ul', 'li', 'p', 'a'))) {
					const startMatch = /^\s*-\s+(.*)$/.exec(token.content);
					if (startMatch) {
						// This is a text block sibling to link which starts with " - ". Presume the start of link description.
						linkForThisBlock.description = startMatch[1];
					} else if (linkForThisBlock.description !== undefined) {
						// Presume continuation of description
						linkForThisBlock.description =
							linkForThisBlock.description.trimRight() + ' ' + token.content.trimLeft();
					}
				}
			}
		}

		/**
		 * Returns true if we are currently inside given sequence of tags
		 * Eg. if stack is ['div', 'p', 'a'], we are in ['p', 'a'], but not in ['div', 'p']
		 * @return {{tag, attrs}}
		 */
		function inTags(...tags) {
			let tagIndex = tags.length - 1;
			for (let i = tagStack.length - 1; i >= 0 && tagIndex >= 0; i--, tagIndex--) {
				if (tagStack[i].tag !== tags[tagIndex]) {
					// Nope
					return false;
				}
			}
			return tagIndex === -1;
		}
	}
}

// *********************************************************************************************************************

class AwesomeGoData {
	constructor(/** AwesomeGoData */ source = undefined) {
		/**
		 * Source string which we parsed
		 * @type {string}
		 */
		this.sourceStr = undefined;

		/**
		 * Sections, with all the links
		 * @type {AwesomeGoSection[]}
		 */
		this.sections = undefined;

		Object.assign(this, source);
	}
}

class AwesomeGoLink {
	constructor(/** AwesomeGoLink */ source = undefined) {
		/**
		 * Where the link leads
		 * @type {string}
		 */
		this.href = undefined;

		/**
		 * Link title
		 * @type {string}
		 */
		this.title = undefined;

		/**
		 * Description of what the link leads to. This goes after link, like: "<link> - Some text here."
		 * @type {string}
		 */
		this.description = undefined;

		Object.assign(this, source);
	}
}

class AwesomeGoSection {
	constructor(/** AwesomeGoSection */ source = undefined) {
		/**
		 * Global group where this section can be found. There are generally 3 on the page: 'Awesome Go', 'Tools' and 'Resources'
		 * @type {string}
		 */
		this.group = undefined;

		/**
		 * Section title
		 * @type {string}
		 */
		this.title = undefined;

		/**
		 * @type {string}
		 */
		this.subtitle = undefined;

		/**
		 * Some sections have subsections, so we might see more links here
		 * @type {AwesomeGoSection[]}
		 */
		this.subsections = undefined;

		/**
		 * Links in this section
		 * @type {AwesomeGoLink[]}
		 */
		this.links = undefined;

		Object.assign(this, source);
	}
}

// *********************************************************************************************************************

module.exports = {
	createAwesomeGoClient,

	parseAwesomeGoData,

	AwesomeGoData,
};
