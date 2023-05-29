import { createElement, render, Component, Fragment, Block } from 'preact';
import { setupRerender } from 'preact/test-utils';
import {
	setupScratch,
	teardown,
	getMixedArray,
	mixedArrayHTML,
	serializeHtml,
	sortAttributes
} from '../_util/helpers';
import { div, span, p } from '../_util/dom';

/** @jsx createElement */
const h = createElement;

function getAttributes(node) {
	let attrs = {};
	if (node.attributes) {
		for (let i = node.attributes.length; i--; ) {
			attrs[node.attributes[i].name] = node.attributes[i].value;
		}
	}
	return attrs;
}

describe.only('Block', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		// teardown(scratch);
	});

	it('should work', () => {
		render(
			<div>
				<p>foo</p>
				<Block
					template={`<div><p>bar</p><h2><slot /><slot name="foo" /></h2></div>`}
				>
					<span>block children</span>
				</Block>
			</div>,
			scratch
		);

		expect(scratch.innerHTML).to.equal('<div><p>foo</p><p>bar</p></div>');
	});
});
