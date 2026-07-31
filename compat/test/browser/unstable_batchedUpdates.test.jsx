import { createElement, render } from 'preact';
import { useState } from 'preact/hooks';
import { unstable_batchedUpdates, flushSync } from 'preact/compat';
import { vi } from 'vitest';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('unstable_batchedUpdates', () => {
	it('should execute & return cb', () => {
		expect(unstable_batchedUpdates(() => false)).to.equal(false);
		expect(unstable_batchedUpdates(arg => arg, true)).to.equal(true);
	});
});

describe('flushSync', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should invoke the given callback', () => {
		const returnValue = {};
		const spy = vi.fn(() => returnValue);
		const result = flushSync(spy);

		expect(spy).toHaveBeenCalledOnce();
		expect(result).to.equal(returnValue);
	});

	it('should batch updates and flush them synchronously', () => {
		let setA;
		let setB;
		const renders = vi.fn();

		function App() {
			const [a, updateA] = useState(0);
			const [b, updateB] = useState(0);
			setA = updateA;
			setB = updateB;
			renders();
			return <p>{a + b}</p>;
		}

		render(<App />, scratch);
		flushSync(() => {
			setA(1);
			setB(1);
		});

		expect(scratch.textContent).to.equal('2');
		expect(renders).toHaveBeenCalledTimes(2);
	});
});
