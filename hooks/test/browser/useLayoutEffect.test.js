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
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useLayoutEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.calledOnce;
		expect(callback).to.be.calledTwice;

		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.calledTwice;
		expect(callback).to.be.calledThrice;
	});

	it('works on a nested component', () => {
		const callback = sinon.spy();

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

		expect(callback).to.be.calledOnce;
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
		expect(executionOrder).to.deep.equal(['cleanup1', 'cleanup2', 'action1', 'action2']);
	});
});
