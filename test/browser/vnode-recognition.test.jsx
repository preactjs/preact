import { cloneElement, createElement, isValidElement, render } from 'preact';
import { jsx, jsxs, jsxDEV, jsxEscape, jsxTemplate } from 'preact/jsx-runtime';
import { setupScratch, teardown } from '../_util/helpers';

describe('VNode recognition', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	for (const [name, create] of [
		['createElement', () => createElement('span', null, 'child')],
		['cloneElement', () => cloneElement(createElement('span', null, 'child'))],
		['jsx', () => jsx('span', { children: 'child' })],
		['jsxs', () => jsxs('span', { children: ['child'] })],
		['jsxDEV', () => jsxDEV('span', { children: 'child' })]
	]) {
		it('should recognize ' + name + ' VNodes', () => {
			const vnode = create();
			expect(vnode.constructor).to.equal(Symbol.for('pv'));
			expect(isValidElement(vnode)).to.equal(true);
			expect(() => structuredClone(vnode)).to.throw();
			render(vnode, scratch);
			expect(scratch.innerHTML).to.equal('<span>child</span>');
		});
	}

	for (const depth of [0, 1]) {
		it('should ignore unmarked children at depth ' + depth, () => {
			const child = structuredClone({
				constructor: undefined,
				type: 'span',
				props: { children: 'ignored' },
				_depth: depth
			});
			expect(isValidElement(child)).to.equal(false);
			render(createElement('div', null, child, 'child'), scratch);
			expect(scratch.innerHTML).to.equal('<div>child</div>');
		});
	}

	it('should preserve the marker when reusing VNodes', () => {
		const child = createElement('span', null, 'child');
		render(createElement('div', null, child, child), scratch);
		expect(scratch.innerHTML).to.equal(
			'<div><span>child</span><span>child</span></div>'
		);
	});

	it('should recognize precompiled JSX VNodes and expressions', () => {
		const child = createElement('span', null, 'child');
		const template = jsxTemplate(['<div>', '</div>'], jsxEscape(child));
		expect(isValidElement(template)).to.equal(true);
		expect(jsxEscape(child)).to.equal(child);
		expect(
			jsxEscape({ constructor: undefined, type: 'span', props: {} })
		).to.equal('[object Object]');
	});
});
