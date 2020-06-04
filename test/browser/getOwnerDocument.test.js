import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('parentDom.ownerDocument', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	before(() => {
		scratch = setupScratch();
	});

	after(() => {
		teardown(scratch);
	});

	it('should reference the correct document from the parent node', () => {
		let spy = sinon.spy(scratch, 'ownerDocument', ['get']);

		function Foo() {
			return <div>A</div>;
		}

		render(<Foo />, scratch);
		expect(scratch.ownerDocument).to.equal(document);
	});
});
