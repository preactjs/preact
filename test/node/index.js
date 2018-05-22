import { expect } from 'chai';
import * as preact from '../../dist/preact';

describe('build artifact', () => {

	// #1075 Check that the build artifact has the correct exports
	it('should have exported properties', () => {
		expect(preact).to.be.an('object');
		expect(preact).to.have.property('h');
		expect(preact).to.have.property('Component');
		expect(preact).to.have.property('render');
		expect(preact).to.have.property('rerender');
		expect(preact).to.have.property('options');
	});
});
