import React, { hydrate } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('compat hydrate', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render react-style jsx', () => {
		const input = document.createElement('input');
		scratch.appendChild(input);
		input.focus();
		expect(document.activeElement).to.equal(input);

		hydrate(<input />, scratch);
		expect(document.activeElement).to.equal(input);
	});
});
