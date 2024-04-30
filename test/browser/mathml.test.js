import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('mathml', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render with the correct namespace URI', () => {
		render(<math />, scratch);

		let namespace = scratch.querySelector('math').namespaceURI;

		expect(namespace).to.equal('http://www.w3.org/1998/Math/MathML');
	});

	it('should render children with the correct namespace URI', () => {
		render(
			<math>
				<mrow />
			</math>,
			scratch
		);

		let namespace = scratch.querySelector('mrow').namespaceURI;

		expect(namespace).to.equal('http://www.w3.org/1998/Math/MathML');
	});
});
