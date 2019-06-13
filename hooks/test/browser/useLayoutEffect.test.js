import { act } from 'preact/test-utils';
import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useEffectAssertions } from './useEffectAssertions.test';
import { useLayoutEffect } from '../../src';

/** @jsx h */

describe('useLayoutEffect', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	// Layout effects fire synchronously
	const scheduleEffectAssert = assertFn => new Promise(resolve => {
		assertFn();
		resolve();
	});

	useEffectAssertions(useLayoutEffect, scheduleEffectAssert);


	it('calls the effect immediately after render', () => {
		const cleanupFunction = jasmine.createSpy('cleanup');
		const callback = jasmine.createSpy('callback').and.callFake(() => cleanupFunction);

		function Comp() {
			useLayoutEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(cleanupFunction).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledTimes(2);

		render(<Comp />, scratch);

		expect(cleanupFunction).toHaveBeenCalledTimes(2);
		expect(callback).toHaveBeenCalledTimes(3);
	});

	it('works on a nested component', () => {
		const callback = jasmine.createSpy('callback');

		function Parent() {
			return (
				<div>
					<Child />
				</div>
			);
		}

		function Child() {
			useLayoutEffect(callback);
			return null;
		}

		render(<Parent />, scratch);

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('Should execute layout effects in the right order', () => {
		let executionOrder = [];
		const App = ({ i }) => {
			executionOrder = [];
			useLayoutEffect(() => {
				executionOrder.push('action1');
				return () => executionOrder.push('cleanup1');
			}, [i]);
			useLayoutEffect(() => {
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
