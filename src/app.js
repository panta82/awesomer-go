function App(settings) {
	/** @type {Settings} */
	this.settings = settings;

	/** @type {MayanLogger} */
	this.logger = new (require('mayan-logger').MayanLogger)({});

	/** @type {MayanLogCollector} */
	this.log = this.logger.log;

	/** @type {AwesomeGoSource} */
	this.awesomeGoSource = require('./lib/awesome_go').createAwesomeGoSource(this);
}

module.exports = {
	App,
};
