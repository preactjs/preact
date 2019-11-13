import React, { createElement, unmountComponentAtNode } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('unmountComponentAtNode', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should unmount a root node', () => {
		const App = () => <div>foo</div>;
		React.render(<App />, scratch);

		expect(unmountComponentAtNode(scratch)).to.equal(true);
		expect(scratch.innerHTML).to.equal('');
	});

	it('should do nothing if root is not mounted', () => {
		expect(unmountComponentAtNode(scratch)).to.equal(false);
		expect(scratch.innerHTML).to.equal('');
	});
});
