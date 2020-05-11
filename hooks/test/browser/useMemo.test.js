import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useMemo } from 'preact/hooks';

/** @jsx createElement */

describe('useMemo', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('only recomputes the result when inputs change', () => {
		let memoFunction = sinon.spy((a, b) => a + b);
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

	it('short circuits diffing for memoized components', () => {
		let spy = sinon.spy();
		let spy2 = sinon.spy();
		const X = ({ count }) => {
			spy();
			return <span>{count}</span>;
		};

		const Y = ({ count }) => {
			spy2();
			return <p>{count}</p>;
		};

		const App = ({ x }) => {
			const y = useMemo(() => <Y count={x} />, [x]);
			return (
				<div>
					<X count={x} />
					{y}
				</div>
			);
		};

		render(<App x={0} />, scratch);
		expect(spy).to.be.calledOnce;
		expect(spy2).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<div><span>0</span><p>0</p></div>');

		render(<App x={0} />, scratch);
		expect(spy).to.be.calledTwice;
		expect(spy2).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<div><span>0</span><p>0</p></div>');

		render(<App x={1} />, scratch);
		expect(spy).to.be.calledThrice;
		expect(spy2).to.be.calledTwice;
		expect(scratch.innerHTML).to.equal('<div><span>1</span><p>1</p></div>');

		render(<App x={1} />, scratch);
		expect(spy2).to.be.calledTwice;
		expect(scratch.innerHTML).to.equal('<div><span>1</span><p>1</p></div>');

		render(<App x={2} />, scratch);
		expect(spy2).to.be.calledThrice;
		expect(scratch.innerHTML).to.equal('<div><span>2</span><p>2</p></div>');
	});
});
