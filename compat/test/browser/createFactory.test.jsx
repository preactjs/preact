import React, { render, createElement, createFactory } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('createFactory', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should create a DOM element', () => {
		render(createFactory('span')({ class: 'foo' }, '1'), scratch);
		expect(scratch.innerHTML).to.equal('<span class="foo">1</span>');
	});

	it('should create a component', () => {
		const Foo = ({ id, children }) => <div id={id}>foo {children}</div>;
		render(createFactory(Foo)({ id: 'value' }, 'bar'), scratch);
		expect(scratch.innerHTML).to.equal('<div id="value">foo bar</div>');
	});
});
