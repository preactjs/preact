const { setupScratch } = require('../../../test/_util/helpers');

describe('setupScratch', () => {
	it('should return a div', () => {
		const element = setupScratch();
		expect(element.id).to.equal('scratch');
		expect(String((document.body || document.documentElement).innerHTML)).to.include('<div id="scratch"></div>');
	});
});
