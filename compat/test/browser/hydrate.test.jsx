import { createElement, hydrate } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { vi } from 'vitest';

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
		expect(document.activeElement).to.equalNode(input);

		hydrate(<input />, scratch);
		expect(document.activeElement).to.equalNode(input);
	});

	it('should call the callback', () => {
		scratch.innerHTML = '<div></div>';

		let spy = vi.fn();
		hydrate(<div />, scratch, spy);
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith();
	});
});
