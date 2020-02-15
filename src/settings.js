const libPath = require('path');

require('dotenv').config({
	path: libPath.resolve(__dirname, '../.env'),
});

module.exports = /** @lends {Settings.prototype} */ {};
