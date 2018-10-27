import { createElement, Component, Fragment, render, hydrate, cloneElement } from '../../src/index';
import { expect } from 'chai';

describe('preact', () => {
	it('should be available as named exports', () => {
		expect(createElement).to.be.a('function');
		expect(Component).to.be.a('function');
		expect(Fragment).to.exist;
		expect(render).to.be.a('function');
		expect(hydrate).to.be.a('function');
		expect(cloneElement).to.be.a('function');
		// expect(rerender).to.be.a('function');
		// expect(options).to.exist.and.be.an('object');
	});
});
