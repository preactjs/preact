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

	it('should rerun when deps length changes', () => {
		let memoFunction = sinon.spy(() => 1 + 2);

		function Comp({ all }) {
			const deps = [1, all && 2].filter(Boolean);
			const result = useMemo(() => memoFunction(), deps);
			return result;
		}

		render(<Comp all />, scratch);
		expect(memoFunction).to.have.been.calledOnce;
		render(<Comp all={false} />, scratch);
		expect(memoFunction).to.have.been.calledTwice;
	});

	it('should rerun when first run threw an error', () => {
		let hasThrown = false;
		let memoFunction = sinon.spy(() => {
			if (!hasThrown) {
				hasThrown = true;
				throw new Error('test');
			} else {
				return 3;
			}
		});

		function Comp() {
			const result = useMemo(() => memoFunction(), []);
			return result;
		}

		expect(() => render(<Comp />, scratch)).to.throw('test');
		expect(memoFunction).to.have.been.calledOnce;
		expect(() => render(<Comp />, scratch)).not.to.throw();
		expect(memoFunction).to.have.been.calledTwice;
	});

	it('short circuits diffing for memoized components', () => {
		const X = sinon.spy(({ count }) => {
			return <span>{count}</span>;
		});

		const Y = sinon.spy(({ count }) => {
			return <p>{count}</p>;
		});

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
		expect(X).to.be.calledOnce;
		expect(Y).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<div><span>0</span><p>0</p></div>');

		render(<App x={0} />, scratch);
		expect(X).to.be.calledTwice;
		expect(Y).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<div><span>0</span><p>0</p></div>');

		render(<App x={1} />, scratch);
		expect(X).to.be.calledThrice;
		expect(Y).to.be.calledTwice;
		expect(scratch.innerHTML).to.equal('<div><span>1</span><p>1</p></div>');

		render(<App x={1} />, scratch);
		expect(Y).to.be.calledTwice;
		expect(scratch.innerHTML).to.equal('<div><span>1</span><p>1</p></div>');

		render(<App x={2} />, scratch);
		expect(Y).to.be.calledThrice;
		expect(scratch.innerHTML).to.equal('<div><span>2</span><p>2</p></div>');
	});
});
