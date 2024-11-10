import { createElement as preactCreateElement, Fragment } from 'preact';
import React, { createElement, isMemo, memo } from 'preact/compat';

describe('isMemo', () => {
	it('should check return false for invalid arguments', () => {
		expect(isMemo(null)).to.equal(false);
		expect(isMemo(false)).to.equal(false);
		expect(isMemo(true)).to.equal(false);
		expect(isMemo('foo')).to.equal(false);
		expect(isMemo(123)).to.equal(false);
		expect(isMemo([])).to.equal(false);
		expect(isMemo({})).to.equal(false);
	});

	it('should detect a preact memo', () => {
		function Foo() {
			return <h1>Hello World</h1>;
		}
		let App = memo(Foo);
		expect(isMemo(App)).to.equal(true);
	});

	it('should not detect a normal element', () => {
		function Foo() {
			return <h1>Hello World</h1>;
		}
		expect(isMemo(Foo)).to.equal(false);
	});

	it('should detect a preact vnode as false', () => {
		expect(isMemo(preactCreateElement(Fragment, {}))).to.equal(false);
	});

	it('should detect a compat vnode as false', () => {
		expect(isMemo(React.createElement(Fragment, {}))).to.equal(false);
	});
});
