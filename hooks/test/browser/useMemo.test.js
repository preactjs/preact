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
