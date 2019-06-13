import { act } from 'preact/test-utils';
import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useEffect } from '../../src';
import { useEffectAssertions } from './useEffectAssertions.test';
import { scheduleEffectAssert } from '../_util/useEffectUtil';


/** @jsx h */

describe('useEffect', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	useEffectAssertions(useEffect, scheduleEffectAssert);


	it('calls the effect immediately if another render is about to start', () => {
		const cleanupFunction = jasmine.createSpy('cleanup');
		const callback = jasmine.createSpy('callback').and.callFake(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(cleanupFunction).not.toHaveBeenCalled();
		expect(callback).toHaveBeenCalledTimes(1);

		render(<Comp />, scratch);

		expect(cleanupFunction).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledTimes(2);
	});

	it('cancels the effect when the component get unmounted before it had the chance to run it', () => {
		const cleanupFunction = jasmine.createSpy('cleanup');
		const callback = jasmine.createSpy('callback').and.callFake(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(null, scratch);

		return scheduleEffectAssert(() => {
			expect(cleanupFunction).not.toHaveBeenCalled();
			expect(callback).not.toHaveBeenCalled();
		});
	});

	it('Should execute effects in the right order', () => {
		let executionOrder = [];
		const App = ({ i }) => {
			executionOrder = [];
			useEffect(() => {
				executionOrder.push('action1');
				return () => executionOrder.push('cleanup1');
			}, [i]);
			useEffect(() => {
				executionOrder.push('action2');
				return () => executionOrder.push('cleanup2');
			}, [i]);
			return <p>Test</p>;
		};
		act(() => render(<App i={0} />, scratch));
		act(() => render(<App i={2} />, scratch));
		expect(executionOrder).toEqual(['cleanup1', 'cleanup2', 'action1', 'action2']);
	});
});
