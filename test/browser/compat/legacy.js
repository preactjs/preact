import React from '../../../compat/legacy';

describe('legacy', () => {
	it('should export server', () => {
		expect(React).to.have.property('renderToStaticMarkup').that.is.a('function');
	});

	it('should export compat', () => {
		expect(React).to.have.property('createElement').that.is.a('function');
		expect(React).to.have.property('render').that.is.a('function');
	});
});
