import React, { createElement, hydrate } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { expect } from 'expectus';
import sinon from 'sinon';

describe('compat hydrate', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render react-style jsx', () => {
		const input = document.createElement('input');
		scratch.appendChild(input);
		input.focus();
		expect(document.activeElement).to.equal(input);

		hydrate(<input />, scratch);
		expect(document.activeElement).to.equal(input);
	});

	it('should call the callback', () => {
		scratch.innerHTML = '<div></div>';

		let spy = sinon.spy();
		hydrate(<div />, scratch, spy);
		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWithExactly();
	});
});
