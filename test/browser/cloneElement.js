import { createElement, cloneElement } from '../../src/index';

/** @jsx createElement */

describe('cloneElement', () => {
	it('should clone components', () => {
		function Comp () {}
		const instance = <Comp prop1={1}>hello</Comp>;
		const clone = cloneElement(instance);

		expect(clone.prototype).to.equal(instance.prototype);
		expect(clone.tag).to.equal(instance.tag);
		expect(clone.props).not.to.equal(instance.props); // Should be a different object...
		expect(clone.props).to.deep.equal(instance.props); // with the same properties
	});

	it('should merge new props', () => {
		function Foo () {}
		const instance = <Foo prop1={1} prop2={2} />;
		const clone = cloneElement(instance, { prop1: -1, newProp: -2 });

		expect(clone.prototype).to.equal(instance.prototype);
		expect(clone.tag).to.equal(instance.tag);
		expect(clone.props).not.to.equal(instance.props);
		expect(clone.props.prop1).to.equal(-1);
		expect(clone.props.prop2).to.equal(2);
		expect(clone.props.newProp).to.equal(-2);
	});

	it('should override children if specified', () => {
		function Foo() {}
		const instance = <Foo>hello</Foo>;
		const clone = cloneElement(instance, null, 'world', '!');

		expect(clone.prototype).to.equal(instance.prototype);
		expect(clone.tag).to.equal(instance.tag);
		expect(clone.props).not.to.equal(instance.props);
		expect(clone.props.children).to.deep.equal(['world', '!']);
	});
});
