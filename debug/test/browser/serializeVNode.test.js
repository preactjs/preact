import { createElement, Component } from 'preact';
import { serializeVNode } from '../../src/debug';

/** @jsx createElement */

describe('serializeVNode', () => {
	it("should prefer a function component's displayName", () => {
		function Foo() {
			return <div />;
		}
		Foo.displayName = 'Bar';

		expect(serializeVNode(<Foo />)).to.equal('<Bar />');
	});

	it("should prefer a class component's displayName", () => {
		class Bar extends Component {
			render() {
				return <div />;
			}
		}
		Bar.displayName = 'Foo';

		expect(serializeVNode(<Bar />)).to.equal('<Foo />');
	});

	it('should serialize vnodes without children', () => {
		expect(serializeVNode(<br />)).to.equal('<br />');
	});

	it('should serialize vnodes with children', () => {
		expect(serializeVNode(<div>Hello World</div>)).to.equal('<div>..</div>');
	});

	it('should serialize components', () => {
		function Foo() {
			return <div />;
		}
		expect(serializeVNode(<Foo />)).to.equal('<Foo />');
	});

	it('should serialize props', () => {
		expect(serializeVNode(<div class="foo" />)).to.equal('<div class="foo" />');

		let noop = () => {};
		expect(serializeVNode(<div onClick={noop} />)).to.equal(
			'<div onClick="function noop() {}" />'
		);

		function Foo(props) {
			return props.foo;
		}

		expect(serializeVNode(<Foo foo={[1, 2, 3]} />)).to.equal(
			'<Foo foo="1,2,3" />'
		);

		expect(serializeVNode(<div prop={Object.create(null)} />)).to.equal(
			'<div prop="[object Object]" />'
		);
	});
});
