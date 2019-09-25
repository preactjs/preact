import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, watch, unwrap, isReactive } from '../../src';

/** @jsx h */

describe('memo', () => {

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

		const Comp = createComponent(({ a, b }) => {
			const result = watch([props => props.a, props => props.b], ([a, b]) =>
				memoFunction(a, b)
			);

			return () => {
				results.push(result.value);
				return null;
			};
		});

		render(<Comp a={1} b={1} />, scratch);
		render(<Comp a={1} b={1} />, scratch);

		expect(results).to.deep.equal([2, 2]);
		expect(memoFunction).to.have.been.calledOnce;

		render(<Comp a={1} b={2} />, scratch);
		render(<Comp a={1} b={2} />, scratch);

		expect(results).to.deep.equal([2, 2, 3, 3]);
		expect(memoFunction).to.have.been.calledTwice;
	});

	it('unwrap and check reactivity', () => {
		const Comp = createComponent(() => {
			const sum = watch(props => props.a + props.b);

			expect(unwrap(sum)).to.equal(3);
			expect(unwrap(sum)).to.equal(sum.value);
			expect(isReactive(sum)).to.be.true;
			expect(isReactive(sum.value)).to.be.false;
			expect(isReactive(null)).to.be.false;
			expect(isReactive(false)).to.be.false;

			return () => null;
		});

		render(<Comp a={1} b={2} />, scratch);
	});

	it('watch with unhandled sources', () => {
		const Comp = createComponent(() => {
			expect(watch(1).value).to.equal(1);
			expect(watch('str').value).to.equal('str');
			expect(watch(null).value).to.equal(null);
			expect(watch(false).value).to.equal(false);
			expect(watch({ a: 1 }).value).to.deep.equal({ a: 1 });
			expect(watch([1, 2]).value).to.deep.equal([1, 2]);

			return () => null;
		});

		render(<Comp />, scratch);
	});

	it('watch async', async () => {
		function fetchData(n) {
			return new Promise(resolve => setTimeout(() => resolve([1, n]), 1));
		}

		let data;
		const Comp = createComponent(() => {
			data = watch(props => props.a, fetchData);

			return () => null;
		});

		render(<Comp a={1} />, scratch);

		expect(data.value).to.deep.equal();

		await new Promise(resolve => setTimeout(resolve, 1));

		expect(data.value).to.deep.equal([1, 1]);
	});

	it('watch async with defaultValue', async () => {
		function fetchData(n) {
			return new Promise(resolve => setTimeout(() => resolve([1, n]), 1));
		}

		let data;
		const Comp = createComponent(() => {
			data = watch(props => props.a, fetchData, []);

			return () => null;
		});

		render(<Comp a={1} />, scratch);

		expect(data.value).to.deep.equal([]);

		await new Promise(resolve => setTimeout(resolve, 1));

		expect(data.value).to.deep.equal([1, 1]);
	});
});
