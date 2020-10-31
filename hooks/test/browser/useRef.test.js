import { createElement, createRoot } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useRef } from 'preact/hooks';

/** @jsx createElement */

describe('useRef', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let render;

	beforeEach(() => {
		scratch = setupScratch();
		({ render } = createRoot(scratch));
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

		render(<Comp />);
		render(<Comp />);

		expect(values).to.deep.equal([1, 2]);
	});
});
