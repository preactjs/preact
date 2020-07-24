import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useRef } from 'preact/hooks';

/** @jsx createElement */

describe('useRef', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('provides a stable reference', () => {
		const values = [];

		function Comp() {
			const ref = useRef(1);
			values.push(ref.current);
			ref.current = 2;
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(values).to.deep.equal([1, 2]);
	});

	it('defaults to null', () => {
		const values = [];

		function Comp() {
			const ref = useRef();
			values.push(ref.current);
			ref.current = 2;
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(values).to.deep.equal([null, 2]);
	});
});
