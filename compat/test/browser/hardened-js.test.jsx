import { act, setupRerender } from 'preact/test-utils';
import { createElement, render, Suspense } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createLazy } from './suspense-utils';
import { expect } from 'vitest';

/** @jsx createElement */

// Suspense detaches the suspended tree by cloning its vnodes, which trips the
// "override mistake" when `Object.prototype.constructor` is non-writable
// (SES `lockdown()`, `node --frozen-intrinsics`, LavaMoat). See #5109 and
// test/browser/hardened-js.test.jsx.
describe('hardened JS (non-writable Object.prototype.constructor)', () => {
	let scratch, rerender, originalDescriptor;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		originalDescriptor = Object.getOwnPropertyDescriptor(
			Object.prototype,
			'constructor'
		);
		Object.defineProperty(Object.prototype, 'constructor', {
			...originalDescriptor,
			writable: false
		});
	});

	afterEach(() => {
		Object.defineProperty(Object.prototype, 'constructor', originalDescriptor);
		teardown(scratch);
	});

	it('should suspend and resume when Object.prototype is hardened', () => {
		const [Lazy, resolve] = createLazy();

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Lazy />
			</Suspense>,
			scratch
		);

		rerender();
		expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

		return act(() => resolve(() => <div>Hello</div>)).then(() => {
			expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		});
	});
});
