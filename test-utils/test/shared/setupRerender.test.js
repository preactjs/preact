import { options, createElement as h, render } from 'preact';
import { spy } from 'sinon';
import { useState } from 'preact/hooks';

import { setupScratch, teardown } from '../../../test/_util/helpers';
import { setupRerender, act } from '../../src';

/** @jsx h */
describe('setupRerender', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	let rerender;

	beforeEach(() => {

		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should reset options after rerender', () => {
		expect(options.debounceRendering).to.equal(undefined);
		rerender();
		expect(options.debounceRendering).to.equal(undefined);
	});

	it('should restore options.debounceRendering', () => {
		const spy = sinon.spy();

		options.debounceRendering = spy;
		rerender = setupRerender();
		act(() => null);

		expect(options.debounceRendering).to.equal(spy);
		expect(spy).to.not.be.called;
	});
});
