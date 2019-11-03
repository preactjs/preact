import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';
import React, { createElement, isValidElement } from 'preact/compat';
import { createElement as preactH } from 'preact';

describe('jsx', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render react-style', () => {
		let jsx = (
			<div className="foo bar" data-foo="bar">
				<span id="some_id">inner!</span>
				{['a', 'b']}
			</div>
		);

		expect(jsx.props).to.have.property('className', 'foo bar');

		React.render(jsx, scratch);
		expect(serializeHtml(scratch)).to.equal(
			'<div class="foo bar" data-foo="bar"><span id="some_id">inner!</span>ab</div>'
		);
	});

	describe('isValidElement', () => {
		it('should check return false for invalid arguments', () => {
			expect(isValidElement(null)).to.equal(false);
			expect(isValidElement(false)).to.equal(false);
			expect(isValidElement(true)).to.equal(false);
			expect(isValidElement('foo')).to.equal(false);
			expect(isValidElement(123)).to.equal(false);
		});

		it('should detect a preact vnode', () => {
			expect(isValidElement(preactH('div'))).to.equal(true);
		});

		it('should detect a compat vnode', () => {
			expect(isValidElement(React.createElement('div'))).to.equal(true);
		});
	});
});
