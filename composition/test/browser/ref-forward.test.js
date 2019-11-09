import { createElement, render, createRef } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent } from '../../src';

/** @jsx createElement */

describe('ref-forward', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('forwards ref', () => {
		const r = createRef();

		// eslint-disable-next-line react/display-name
		const Comp = createComponent(() => (_, ref) => (
			<div ref={ref}>Content</div>
		));

		render(<Comp ref={r} />, scratch);

		expect(r.current).to.equal(scratch.firstChild);

		render(<div />, scratch);

		expect(r.current).to.be.null;
	});

	it('forwards function to ref', () => {
		const spy = sinon.spy();

		// eslint-disable-next-line react/display-name
		const Comp = createComponent(() => (_, ref) => (
			<div ref={ref}>Content</div>
		));

		render(<Comp ref={spy} />, scratch);

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith(scratch.firstChild);

		render(<div />, scratch);
		expect(spy).to.be.calledTwice;
		expect(spy).to.be.calledWith(null);
	});
});
