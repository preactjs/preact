/* eslint-disable react/display-name */
import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, memo } from '../../src';

/** @jsx createElement */

describe('memo', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('memoize shallow props', () => {
		const renders = sinon.spy();
		const Comp = createComponent(() => {
			memo();
			return renders;
		});

		render(<Comp a={1} />, scratch);
		render(<Comp a={1} />, scratch);

		expect(renders).to.be.calledOnce;

		render(<Comp a={2} />, scratch);

		expect(renders).to.be.calledTwice;
	});

	it('memoize fun', () => {
		const comparer = sinon.spy((prev, next) => prev.a !== next.a);
		const renders = sinon.spy();
		const Comp = createComponent(() => {
			memo(comparer);
			return renders;
		});

		render(<Comp a={1} />, scratch);
		render(<Comp a={1} />, scratch);

		expect(renders).to.be.calledOnce;
		expect(comparer).to.be.calledOnce;
		expect(comparer).to.be.calledWith({ a: 1 }, { a: 1 });

		render(<Comp a={2} />, scratch);

		expect(renders).to.be.calledTwice;
		expect(comparer).to.be.calledTwice;
		expect(comparer).to.be.calledWith({ a: 1 }, { a: 2 });
	});
});
