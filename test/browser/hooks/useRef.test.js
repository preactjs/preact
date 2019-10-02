import { createElement as h, render, useRef } from '../../../src';
import { setupScratch, teardown } from '../../_util/helpers';

/** @jsx h */


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

});
