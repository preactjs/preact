import { createElement as h, options, render, createRef } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';
import { serializeVNode } from '../../src/debug/debug';

/** @jsx h */

describe('debug', () => {
	let scratch;
	let errors = [];

	beforeEach(() => {
		errors = [];
		scratch = setupScratch();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
	});

	afterEach(() => {

		/** @type {*} */
		(console.error).restore();
		teardown(scratch);
	});

	after(() => {
		delete options.beforeDiff;
	});

	it('should print an error on undefined component', () => {
		let fn = () => render(h(undefined), scratch);
		expect(fn).to.throw(/createElement/);
	});

	it('should print an error on invalid refs', () => {
		let fn = () => render(<div ref="a" />, scratch);
		expect(fn).to.throw(/createRef/);

		// Allow strings for compat
		let vnode = <div ref="a" />;

		/** @type {*} */
		(vnode).$$typeof = 'foo';
		render(vnode, scratch);
		expect(console.error).to.not.be.called;
	});

	it('should NOT print an error on valid refs', () => {
		let noop = () => {};
		render(<div ref={noop} />, scratch);

		let ref = createRef();
		render(<div ref={ref} />, scratch);
		expect(console.error).to.not.be.called;
	});

	it('should print an error on duplicate keys', () => {
		render(<div><span key="a" /><span key="a" /></div>, scratch);
		expect(console.error).to.be.calledOnce;
	});

	describe('serializeVNode', () => {
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
			expect(serializeVNode(<div onClick={noop} />))
				.to.equal('<div onClick="function noop() {}" />');

			function Foo(props) {
				return props.foo;
			}

			expect(serializeVNode(<Foo foo={[1, 2, 3]} />))
				.to.equal('<Foo foo="1,2,3" />');
		});
	});
});
