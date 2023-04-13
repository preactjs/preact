import { createElement, cloneElement, createRef, Component } from 'preact';

/** @jsx createElement */

describe('cloneElement', () => {
	it('should clone components', () => {
		function Comp() {}
		const instance = <Comp prop1={1}>hello</Comp>;
		const clone = cloneElement(instance);

		expect(clone.prototype).to.equal(instance.prototype);
		expect(clone.type).to.equal(instance.type);
		expect(clone.props).not.to.equal(instance.props); // Should be a different object...
		expect(clone.props).to.deep.equal(instance.props); // with the same properties
	});

	it('should merge new props', () => {
		function Foo() {}
		const instance = <Foo prop1={1} prop2={2} />;
		const clone = cloneElement(instance, { prop1: -1, newProp: -2 });

		expect(clone.prototype).to.equal(instance.prototype);
		expect(clone.type).to.equal(instance.type);
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
		expect(clone.type).to.equal(instance.type);
		expect(clone.props).not.to.equal(instance.props);
		expect(clone.props.children).to.deep.equal(['world', '!']);
	});

	it('should override children if null is provided as an argument', () => {
		function Foo() {}
		const instance = <Foo>foo</Foo>;
		const clone = cloneElement(instance, { children: 'bar' }, null);

		expect(clone.prototype).to.equal(instance.prototype);
		expect(clone.type).to.equal(instance.type);
		expect(clone.props).not.to.equal(instance.props);
		expect(clone.props.children).to.be.null;
	});

	it('should override key if specified', () => {
		function Foo() {}
		const instance = <Foo key="1">hello</Foo>;

		let clone = cloneElement(instance);
		expect(clone.key).to.equal('1');

		clone = cloneElement(instance, { key: '2' });
		expect(clone.key).to.equal('2');
	});

	it('should override ref if specified', () => {
		function a() {}
		function b() {}
		function Foo() {}
		const instance = <Foo ref={a}>hello</Foo>;

		let clone = cloneElement(instance);
		expect(clone.ref).to.equal(a);

		clone = cloneElement(instance, { ref: b });
		expect(clone.ref).to.equal(b);
	});

	it('should normalize props (ref)', () => {
		const div = <div>hello</div>;
		const clone = cloneElement(div, { ref: createRef() });
		expect(clone.props.ref).to.equal(undefined);
	});

	it('should normalize props (key)', () => {
		const div = <div>hello</div>;
		const clone = cloneElement(div, { key: 'myKey' });
		expect(clone.props.key).to.equal(undefined);
	});

	it('should prevent undefined properties from overriding default props', () => {
		class Example extends Component {
			render(props) {
				return <div style={{ color: props.color }}>thing</div>;
			}
		}
		Example.defaultProps = { color: 'blue' };

		const element = <Example color="red" />;
		const clone = cloneElement(element, { color: undefined });
		expect(clone.props.color).to.equal('blue');
	});
});
