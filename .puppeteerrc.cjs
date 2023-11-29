/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
	browserRevision: "1230674",
	cacheDirectory: __dirname + "/node_modules/puppeteer/.local-chromium",
	// Downloading experimental arm chromium for m1 macs is not working atm
	experiments: {
		macArmChromiumEnabled: process.platform === "darwin" && process.arch === "arm64",
	},
};
