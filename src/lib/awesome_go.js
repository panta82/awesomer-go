const assert = require('assert');

const MarkdownIt = require('markdown-it');
const axios = require('axios').default;

const AWESOME_GO_URL = 'https://raw.githubusercontent.com/avelino/awesome-go/master/README.md';

/**
 * @param {App} app
 */
function createAwesomeGoSource(app) {
	const log = app.logger.for('AwesomeGoSource');

	return /** @lends {AwesomeGoSource.prototype} */ {
		_fetch,
		_parse,
		getData,
	};

	async function _fetch() {
		const res = await axios.get(AWESOME_GO_URL);
		if (res.status !== 200) {
			const error = new Error(`Failed to fetch AwesomeGo source: ${res.status} ${res.statusText}`);
			log.error(error, res);
			throw error;
		}
		return res.data;
	}

	/**
	 * Parse awesome-go source, provided in markdown format
	 * @param sourceStr
	 * @return {AwesomeGoData}
	 */
	function _parse(sourceStr) {
		const markdownIt = new MarkdownIt();
		const tokens = markdownIt.parse(sourceStr, {});

		/** @type {Array<{tag, attrs}>} */
		const tagStack = [];

		const sections = [];

		/** @type {AwesomeGoLink} */
		let currentLink = null;

		/** @type {AwesomeGoSection} */
		let currentSection = null;

		parseTokens(tokens);

		return new AwesomeGoData({
			sourceStr,
			sections,
		});

		function parseTokens(tokens) {
			for (let index = 0; index < tokens.length; index++) {
				const token = tokens[index];

				//console.log(token);

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
						links: [],
					});
					sections.push(currentSection);
				} else if (token.type === 'link_open' && currentSection) {
					const hrefAttr = token.attrs.find(attr => attr[0] === 'href');
					if (hrefAttr) {
						const href = hrefAttr[1];
						currentLink = new AwesomeGoLink({
							href,
						});
					}
				} else if (token.type === 'link_close' && currentLink) {
					if (currentSection) {
						currentSection.links.push(currentLink);
					}
					currentLink = null;
				} else if (token.type === 'text') {
					if (inTags('h2') && currentSection && !currentSection.title) {
						// First text in section, this is title
						currentSection.title = token.content;
					} else if (
						inTags('em', 'p') &&
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
					}
				}
			}

			/**
			 * Returns true if we are currently inside given sequence of tags (given in reverse order, from the top)
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

	/**
	 * @return {Promise<AwesomeGoData>}
	 */
	async function getData() {
		const sourceStr = await _fetch();
		const result = _parse(sourceStr);
		return result;
	}
}

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

/**
 * Different types of links on awesome go
 * @enum
 */
const AWESOME_GO_LINK_TYPE = {
	anchor: 'anchor',
	github: 'github',
	external: 'external',
};

class AwesomeGoLink {
	constructor(/** AwesomeGoLink */ source = undefined) {
		/**
		 * Link type
		 * @type {AWESOME_GO_LINK_TYPE}
		 */
		this.type = undefined;

		/**
		 * Where the link leads
		 * @type {string}
		 */
		this.href = undefined;

		/**
		 * Link title
		 * @type {undefined}
		 */
		this.title = undefined;

		Object.assign(this, source);
	}
}

class AwesomeGoSection {
	constructor(/** AwesomeGoSection */ source = undefined) {
		/**
		 * @type {string}
		 */
		this.title = undefined;

		/**
		 * @type {string}
		 */
		this.subtitle = undefined;

		/**
		 * Links in this section
		 * @type {AwesomeGoLink[]}
		 */
		this.links = undefined;

		Object.assign(this, source);
	}
}

module.exports = {
	createAwesomeGoSource,

	AwesomeGoData,
};
