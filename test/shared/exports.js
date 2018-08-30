import preact, { createElement, Component, Fragment, render, hydrate, cloneElement } from '../../src/index';
import { expect } from 'chai';

describe('preact', () => {
	it('should be available as a default export', () => {
		expect(preact).to.be.an('object');
		expect(preact).to.have.property('createElement', createElement);
		expect(preact).to.have.property('Component', Component);
		expect(preact).to.have.property('Fragment', Fragment);
		expect(preact).to.have.property('render', render);
		expect(preact).to.have.property('hydrate', hydrate);
		expect(preact).to.have.property('cloneElement', cloneElement);
		// expect(preact).to.have.property('rerender', rerender);
		// expect(preact).to.have.property('options', options);
	});

	it('should be available as named exports', () => {
		expect(createElement).to.be.a('function');
		expect(Component).to.be.a('function');
		expect(Fragment).to.be.a('function');
		expect(render).to.be.a('function');
		expect(hydrate).to.be.a('function');
		expect(cloneElement).to.be.a('function');
		// expect(rerender).to.be.a('function');
		// expect(options).to.exist.and.be.an('object');
	});
});
