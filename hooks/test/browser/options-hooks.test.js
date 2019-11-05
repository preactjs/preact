import {
	afterDiffSpy,
	beforeRenderSpy,
	unmountSpy
} from '../../../test/_util/optionSpies';

import { setupRerender } from 'preact/test-utils';
import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useState } from 'preact/hooks';

/** @jsx createElement */

describe('hook options', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {() => void} */
	let increment;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		afterDiffSpy.resetHistory();
		unmountSpy.resetHistory();
		beforeRenderSpy.resetHistory();
	});

	afterEach(() => {
		teardown(scratch);
	});

	function App() {
		const [count, setCount] = useState(0);
		increment = () => setCount(prevCount => prevCount + 1);
		return <div>{count}</div>;
	}

	it('should call old options on mount', () => {
		render(<App />, scratch);

		expect(beforeRenderSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old options.diffed on update', () => {
		render(<App />, scratch);

		increment();
		rerender();

		expect(beforeRenderSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old options on unmount', () => {
		render(<App />, scratch);
		render(null, scratch);

		expect(unmountSpy).to.have.been.called;
	});
});
