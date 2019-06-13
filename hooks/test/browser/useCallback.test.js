import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useCallback } from '../../src';

/** @jsx h */


describe('useCallback', () => {

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

		function Comp({ a, b }) {
			const cb = useCallback(() => a + b, [a, b]);
			callbacks.push(cb);
			return null;
		}

		render(<Comp a={1} b={1} />, scratch);
		render(<Comp a={1} b={1} />, scratch);

		expect(callbacks[0]).toBe(callbacks[1]);
		expect(callbacks[0]()).toBe(2);

		render(<Comp a={1} b={2} />, scratch);
		render(<Comp a={1} b={2} />, scratch);

		expect(callbacks[1]).not.toBe(callbacks[2]);
		expect(callbacks[2]).toBe(callbacks[3]);
		expect(callbacks[2]()).toBe(3);
	});

});
