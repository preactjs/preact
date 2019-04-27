import { setupScratch, teardown } from '../../../test/_util/helpers';
import { h, Component, Fragment } from 'preact';
import { forwardRef, memo } from 'preact/compat';
import { setIn } from '../../src/devtools/util';
import { getDisplayName } from '../../src/devtools/vnode';

/** @jsx h */

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('setIn', () => {
		it('should set top property', () => {
			let obj = {};
			setIn(obj, ['foo'], 'bar');
			expect(obj).to.deep.equal({ foo: 'bar' });
		});

		it('should set deep property', () => {
			let obj2 = { foo: { bar: [{ baz: 1 }] } };
			setIn(obj2, ['foo', 'bar', 0, 'baz'], 2);
			expect(obj2).to.deep.equal({ foo: { bar: [{ baz: 2 }] } });
		});

		it('should overwrite property', () => {
			let obj = { foo: 'foo' };
			setIn(obj, ['foo'], 'bar');
			expect(obj).to.deep.equal({ foo: 'bar' });
		});

		it('should set array property', () => {
			let obj = { foo: ['foo'] };
			setIn(obj, ['foo', 0], 'bar');
			expect(obj).to.deep.equal({ foo: ['bar'] });
		});

		it('should return null on invalid obj', () => {
			expect(setIn(null, ['foo', 'bar'], 'bar')).to.equal(undefined);
		});
	});


	describe('getDisplayName', () => {
		it('should get dom name', () => {
			expect(getDisplayName(h('div'))).to.equal('div');
		});

		it('should get Functional Component name', () => {
			function Foo() {
				return <div />;
			}

			expect(getDisplayName(h(Foo))).to.equal('Foo');
		});

		it('should prefer a function Component\'s displayName property', () => {
			function Foo() {
				return <div />;
			}
			Foo.displayName = 'Bar';

			expect(getDisplayName(h(Foo))).to.equal('Bar');
		});

		it('should get class name', () => {
			class Bar extends Component {
				render() {
					return <div />;
				}
			}

			expect(getDisplayName(h(Bar))).to.equal('Bar');
		});

		it('should prefer a class Component\'s displayName property', () => {
			class Bar extends Component {
				render() {
					return <div />;
				}
			}
			Bar.displayName = 'Foo';

			expect(getDisplayName(h(Bar))).to.equal('Foo');
		});

		it('should get a Fragment\'s name', () => {
			expect(getDisplayName(h(Fragment))).to.equal('Fragment');
		});

		it('should get text VNode name', () => {
			let vnode = h('div', {}, ['text']);
			let textVNode = vnode.props.children[0];

			expect(textVNode).to.be.exist;
			expect(getDisplayName(textVNode)).to.equal('#text');
		});

		it('should recognize Memo wrappers', () => {
			function App() {
				return 'foo';
			}
			let vnode = h(memo(App));
			expect(getDisplayName(vnode)).to.equal('Memo(App)');

			class Foo extends Component {
				render() {
					return 'foo';
				}
			}

			vnode = h(memo(Foo));
			expect(getDisplayName(vnode)).to.equal('Memo(Foo)');
		});

		it('should get name for forwardRef', () => {
			// eslint-disable-next-line prefer-arrow-callback
			let App = forwardRef(function App(_, ref) {
				return <div ref={ref}>foo</div>;
			});
			expect(getDisplayName(h(App))).to.equal('ForwardRef(App)');
		});
	});
});
