import { createElement, hydrate, isValidElement, render } from 'preact';
import { signal } from '@preact/signals';
import { renderToString } from 'preact-render-to-string';
import { vi } from 'vitest';
import { setupScratch, teardown } from '../_util/helpers';

describe('Signals integration', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should recognize and update signal children', async () => {
		const text = signal('initial');
		expect(isValidElement(text)).to.equal(true);
		render(<p>{text}</p>, scratch);
		expect(scratch.innerHTML).to.equal('<p>initial</p>');

		text.value = 'updated';
		await vi.waitFor(() => {
			expect(scratch.innerHTML).to.equal('<p>updated</p>');
		});
	});

	it('should hydrate server-rendered signal children', async () => {
		const text = signal('server');
		scratch.innerHTML = renderToString(<p>{text}</p>);
		expect(scratch.innerHTML).to.equal('<p>server</p>');
		const node = scratch.firstChild;

		hydrate(<p>{text}</p>, scratch);
		expect(scratch.firstChild).to.equal(node);
		expect(scratch.innerHTML).to.equal('<p>server</p>');

		text.value = 'client';
		await vi.waitFor(() => {
			expect(scratch.innerHTML).to.equal('<p>client</p>');
		});
	});
});
