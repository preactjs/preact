import React, { createElement, render } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { getSymbol } from './testUtils';

describe('compat createElement()', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should normalize vnodes', () => {
		let vnode = (
			<div a="b">
				<a>t</a>
			</div>
		);

		const $$typeof = getSymbol('react.element', 0xeac7);
		expect(vnode).to.have.property('$$typeof', $$typeof);
		expect(vnode).to.have.property('type', 'div');
		expect(vnode)
			.to.have.property('props')
			.that.is.an('object');
		expect(vnode.props).to.have.property('children');
		expect(vnode.props.children).to.have.property('$$typeof', $$typeof);
		expect(vnode.props.children).to.have.property('type', 'a');
		expect(vnode.props.children)
			.to.have.property('props')
			.that.is.an('object');
		expect(vnode.props.children.props).to.eql({ children: 't' });
	});

	it('should not normalize text nodes', () => {
		String.prototype.capFLetter = function() {
			return this.charAt(0).toUpperCase() + this.slice(1);
		};
		let vnode = <div>hi buddy</div>;

		render(vnode, scratch);

		expect(scratch.innerHTML).to.equal('<div>hi buddy</div>');
	});
});
