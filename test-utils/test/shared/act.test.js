import { options, createElement as h, render } from 'preact';
import sinon from 'sinon';
import { useState } from 'preact/hooks';

import { setupScratch, teardown } from '../../../test/_util/helpers';
import { act, setupRerender } from '../../src';

/** @jsx h */
describe('act', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should reset options after act finishes', () => {
		expect(options.afterPaint).to.equal(undefined);
		act(() => {
			console.log('testing');
		});
		expect(options.afterPaint).to.equal(undefined);
	});

	it('should drain the queue of hooks', () => {
		function StateContainer() {
			const [count, setCount] = useState(0);
			return (<div>
				<p>Count: {count}</p>
				<button onClick={() => setCount(c => c + 11)} />
			</div>);
		}

		render(<StateContainer />, scratch);
		expect(scratch.textContent).to.include('Count: 0');
		act(() => {
			const button = scratch.querySelector('button');
			button.click();
			expect(scratch.textContent).to.include('Count: 0');
		});
		expect(scratch.textContent).to.include('Count: 1');
	});

	it('should restore options.afterPaint', () => {
		const spy = sinon.spy();

		options.afterPaint = spy;
		act(() => null);

		expect(options.afterPaint).to.equal(spy);
		expect(spy).to.not.be.called;
	});

	it('should restore options.debounceRendering after act', () => {
		const spy = sinon.spy();

		options.debounceRendering = spy;
		act(() => null);

		expect(options.debounceRendering).to.equal(spy);
		expect(spy).to.not.be.called;
	});
});
