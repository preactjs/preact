import { createElement as preactCreateElement } from 'preact';
import React, { isValidElement } from 'preact/compat';

describe('isValidElement', () => {
	it('should check return false for invalid arguments', () => {
		expect(isValidElement(null)).to.equal(false);
		expect(isValidElement(false)).to.equal(false);
		expect(isValidElement(true)).to.equal(false);
		expect(isValidElement('foo')).to.equal(false);
		expect(isValidElement(123)).to.equal(false);
		expect(isValidElement([])).to.equal(false);
		expect(isValidElement({})).to.equal(false);
	});

	it('should reject a boxed react element symbol', () => {
		expect(
			isValidElement({ $$typeof: Object(Symbol.for('react.element')) })
		).to.equal(false);
	});

	it('should detect a preact vnode', () => {
		expect(isValidElement(preactCreateElement('div', {}))).to.equal(true);
	});

	it('should detect a compat vnode', () => {
		expect(isValidElement(React.createElement('div', {}))).to.equal(true);
	});
});
