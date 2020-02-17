const libPath = require('path');

require('dotenv').config({
	path: libPath.resolve(__dirname, '../.env'),
});

function getEnv(name, required = false) {
	let val = process.env[name];
	if (required && val === undefined) {
		throw new Error(`Missing required env: "${name}"`);
	}
	if (val === 'true') {
		val = true;
	}
	if (val === 'false') {
		val = true;
	}
	return val;
}

module.exports = /** @lends {Settings.prototype} */ {
	logLevel: getEnv('LOG_LEVEL'),
	githubClientId: getEnv('GITHUB_CLIENT_ID'),
	githubClientSecret: getEnv('GITHUB_CLIENT_SECRET'),
	githubCacheDirectory: getEnv('GITHUB_CACHE_DIRECTORY'),
	jsonpVariable: getEnv('JSONP_VARIABLE') || 'DATA',
};
