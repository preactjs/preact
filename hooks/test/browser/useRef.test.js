import { setupRerender } from '../../../test-utils/src';
import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useRef } from '../../src';

/** @jsx h */


describe('useRef', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
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

});
