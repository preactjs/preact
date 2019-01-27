import { createElement as h, render } from 'preact';
import { spy } from 'sinon';
import { setupScratch, teardown, setupRerender } from '../../../test/_util/helpers';
import { useMemo } from '../../src';

/** @jsx h */


xdescribe('useMemo', () => {

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


	it('only recomputes the result if a new function instance is passed, when no inputs are specified', () => {
		let memoFunction = spy(() => 1);
		const results = [];

		function Comp() {
			const result = useMemo(memoFunction);
			results.push(result);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(results).to.deep.equal([1, 1]);
		expect(memoFunction).to.have.been.calledOnce;

		memoFunction = spy(() => 2);

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(results).to.deep.equal([1, 1, 2, 2]);
		expect(memoFunction).to.have.been.calledOnce;
	});

	it('only recomputes the result when inputs change', () => {
		let memoFunction = spy((a, b) => a + b);
		const results = [];

		function Comp({ a, b }) {
			const result = useMemo(() => memoFunction(a, b), [a, b]);
			results.push(result);
			return null;
		}

		render(<Comp a={1} b={1} />, scratch);
		render(<Comp a={1} b={1} />, scratch);

		expect(results).to.deep.equal([2, 2]);
		expect(memoFunction).to.have.been.calledOnce;

		render(<Comp a={1} b={2} />, scratch);
		render(<Comp a={1} b={2} />, scratch);

		expect(results).to.deep.equal([2, 2, 3, 3]);
		expect(memoFunction).to.have.been.calledTwice;
	});

});
