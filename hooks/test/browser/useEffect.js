import { createElement as h, render } from 'preact';
import { spy } from 'sinon';
import { setupScratch, teardown, setupRerender } from '../../../test/_util/helpers';
import { useEffect } from '../../src';
import { useEffectAssertions } from './useEffectAssertions';
import { scheduleEffectAssert } from './useEffectUtil';


/** @jsx h */

describe('useEffect', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	useEffectAssertions(useEffect, scheduleEffectAssert);


	it('calls the effect immediately if another render is about to start', () => {
		const cleanupFunction = spy();
		const callback = spy(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.not.called;
		expect(callback).to.be.calledOnce;

		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.calledOnce;
		expect(callback).to.be.calledTwice;
	});

	it('cancels the effect when the component get unmounted before it had the chance to run it', () => {
		const cleanupFunction = spy();
		const callback = spy(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(null, scratch);

		return scheduleEffectAssert(() => {
			expect(cleanupFunction).to.not.be.called;
			expect(callback).to.not.be.called;
		});
	});
});
