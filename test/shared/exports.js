import preact, { h, render, Component, hooks, options } from '../../src/preact';
import { expect } from 'chai';

describe('preact', () => {
	it('should be available as a default export', () => {
		expect(preact).to.be.an('object');
		expect(preact).to.have.property('h', h);
		expect(preact).to.have.property('render', render);
		expect(preact).to.have.property('Component', Component);
		expect(preact).to.have.property('hooks', hooks);
		expect(preact).to.have.property('options', options);
	});

	it('should be available as named exports', () => {
		expect(h).to.be.a('function');
		expect(render).to.be.a('function');
		expect(Component).to.be.a('function');
		expect(hooks).to.exist.and.be.an('object');
		expect(options).to.exist.and.be.an('object');
	});
});
