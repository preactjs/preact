import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, watch } from '../../src';

/** @jsx createElement */

describe('callback', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('only recomputes the callback when inputs change', () => {
		const callbacks = [];

		const Comp = createComponent(props => {
			// this may look a bit complex
			const cb = watch([props => props.a, props => props.b], (a, b) => () =>
				a + b
			);
			// most of times this could be just
			// const cb = () => props.a + props.b;

			return () => {
				callbacks.push(cb.value);

				return null;
			};
		});

		render(<Comp a={1} b={1} />, scratch);
		render(<Comp a={1} b={1} />, scratch);

		expect(callbacks[0]).to.equal(callbacks[1]);
		expect(callbacks[0]()).to.equal(2);

		render(<Comp a={1} b={2} />, scratch);
		render(<Comp a={1} b={2} />, scratch);

		expect(callbacks[1]).to.not.equal(callbacks[2]);
		expect(callbacks[2]).to.equal(callbacks[3]);
		expect(callbacks[2]()).to.equal(3);
	});
});
