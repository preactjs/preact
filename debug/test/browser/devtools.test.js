import { setupRerender } from 'preact/test-utils';
import {
	createElement,
	createElement as h,
	Fragment,
	options,
	Component,
	render
} from 'preact';
import {
	getDisplayName,
	setIn,
	isRoot,
	getData,
	shallowEqual,
	hasDataChanged,
	getChildren
} from '../../src/devtools/custom';
import {
	setupScratch,
	teardown,
	clearOptions
} from '../../../test/_util/helpers';
import { initDevTools } from '../../src/devtools';
import { Renderer } from '../../src/devtools/renderer';
import { memo, forwardRef, createPortal } from '../../../compat/src';

/** @jsx h */

/** @typedef {import('../../src/internal').DevtoolsHook & { log: any[], clear: () => void }} MockHook */

/**
 * Serialize a devtool events and filter out `updateProfilerTimes` because it
 * relies on timings which would lead to flaky tests.
 * @param {import('../../src/internal').DevtoolsEvent[]} events
 */
function serialize(events) {
	return events
		.filter(x => x.type != 'updateProfileTimes')
		.map(x => ({
			type: x.type,
			component:
				x.internalInstance.type !== null
					? getDisplayName(x.internalInstance)
					: '#text: ' + x.internalInstance.props
		}));
}

/**
 * @returns {MockHook}
 */
function createMockHook() {
	let roots = new Set();

	/** @type {Array<import('../../src/internal').DevtoolsEvent>} */
	let events = [];

	function emit(ev, data) {
		if (ev == 'renderer-attached') return;
		events.push(data);
	}

	function getFiberRoots() {
		return roots;
	}

	function clear() {
		roots.clear();
		events.length = 0;
	}

	let helpers = {};

	return {
		on() {},
		inject() {
			return 'abc';
		},
		onCommitFiberRoot() {},
		onCommitFiberUnmount(rid, vnode) {
			if (helpers[rid] != null) {
				helpers[rid].handleCommitFiberUnmount(vnode);
			}
		},
		_roots: roots,
		log: events,
		_renderers: {},
		helpers,
		clear,
		getFiberRoots,
		emit
	};
}

/**
 * Check if the event has been seen (=mounted in most cases) before.
 * @param {import('../../src/internal').VNode} event
 * @param {Set<import('../../src/internal').VNode>} seen
 * @returns {boolean}
 */
function checkPreceding(vnode, seen) {
	if (vnode == null) return true;

	// If a leaf node is a Fragment and has no children it will be skipped
	if (vnode.type === Fragment && vnode._children == 0) return true;

	return seen.has(vnode);
}

/**
 * Verify the references in the events passed to the devtools. Component have to
 * be traversed in a child-depth-first order for the devtools to work.
 * @param {Array<import('../../src/internal').DevtoolsEvent>} events
 */
function checkEventReferences(events) {
	let seen = new Set();

	events.forEach((event, i) => {
		if (
			i > 0 &&
			event.type !== 'unmount' &&
			Array.isArray(event.data.children)
		) {
			event.data.children.forEach(child => {
				if (!checkPreceding(child, seen) && event.type !== 'rootCommitted') {
					throw new Error(
						`Event at index ${i} has a child that could not be found in a preceding event for component "${getDisplayName(
							child
						)}"`
					);
				}
			});
		}

		let inst = event.internalInstance;
		if (event.type == 'mount') {
			seen.add(inst);
		} else if (
			!checkPreceding(event.internalInstance, seen) &&
			event.type !== 'rootCommitted'
		) {
			throw new Error(
				`Event at index ${i} for component ${
					inst != null ? getDisplayName(inst) : inst
				} is not mounted. Perhaps you forgot to send a "mount" event prior to this?`
			);
		}

		// A "root" event must be a `Wrapper`, otherwise the
		// Profiler tree view will be messed up.
		if (event.type == 'root' && event.data.nodeType != 'Wrapper') {
			throw new Error(
				`Event of type "root" must be a "Wrapper". Found "${event.data.nodeType}" instead.`
			);
		}

		if (i == events.length - 1) {
			// Assert that the last child is of type `rootCommitted`
			if (event.type != 'rootCommitted') {
				throw new Error(
					`The last event must be of type 'rootCommitted' for every committed tree`
				);
			}

			// Assert that the root node is a wrapper node (=Fragment). Otherwise the
			// Profiler tree view will be messed up.
			if (event.data.nodeType !== 'Wrapper') {
				throw new Error(
					`The root node must be a "Wrapper" node (like a Fragment) for the Profiler to display correctly. Found "${event.data.nodeType}" instead.`
				);
			}
		}
	});
}

/**
 * @param {import('../../src/internal').PreactElement} element
 */
function getRoot(element) {
	return element._children;
}

const supported =
	/Chrome|Firefox/i.test(navigator.userAgent) &&
	!/Edge/i.test(navigator.userAgent);

describe('devtools', () => {
	if (!supported) return;

	/** @type {import('../../src/internal').PreactElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {MockHook} */
	let hook;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		clearOptions();

		hook = createMockHook();

		/** @type {import('../../src/internal').DevtoolsWindow} */
		(window).__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;

		initDevTools();
		let rid = Object.keys(hook._renderers)[0];

		// Trigger setter.
		hook.helpers[rid] = {};
		hook.clear();

		// Syp on catchError wrapper in devtools hook
		sinon.spy(console, 'error');
	});

	afterEach(() => {
		teardown(scratch);

		if (/** @type {*} */ (console.error).callCount > 0) {
			throw new Error('Uncaught error in devtools');
		}

		/** @type {*} */
		(console.error).restore();

		delete /** @type {import('../../src/internal').DevtoolsWindow} */ (window).__REACT_DEVTOOLS_GLOBAL_HOOK__;
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

		it("should prefer a function Component's displayName property", () => {
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

		it("should prefer a class Component's displayName property", () => {
			class Bar extends Component {
				render() {
					return <div />;
				}
			}
			Bar.displayName = 'Foo';

			expect(getDisplayName(h(Bar))).to.equal('Foo');
		});

		it("should get a Fragment's name", () => {
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

	describe('hasDataChanged', () => {
		it('should detect prop updates', () => {
			let a = createElement('div', { foo: 1 });
			let b = createElement('div', { foo: 2 });
			expect(hasDataChanged(a, a)).to.equal(false);
			expect(hasDataChanged(a, b)).to.equal(true);
		});

		it('should detect state changes', () => {
			let a = createElement('div', { foo: 1 });
			let b = createElement('div', { foo: 1 });

			b._component = a._component = {
				state: { foo: 1 },
				_prevState: { foo: 1 }
			};
			expect(hasDataChanged(a, b)).to.equal(false);

			b._component = { state: { foo: 2 }, _prevState: { foo: 1 } };
			expect(hasDataChanged(a, b)).to.equal(true);
		});
	});

	describe('getChildren', () => {
		it('should get component children', () => {
			const Foo = () => <div>foo{null}bar</div>;
			render(<Foo />, scratch);

			const fooVNode = getRoot(scratch)._children[0];
			const expectedChildren = fooVNode._children;
			expect(getChildren(fooVNode)).to.deep.equal(expectedChildren);
		});

		it('should get component children for empty component', () => {
			const Foo = () => {};
			render(<Foo />, scratch);

			const fooVNode = getRoot(scratch)._children[0];
			expect(getChildren(fooVNode)).to.deep.equal([]);
		});

		it('should get native element children', () => {
			render(<div>foo</div>, scratch);

			const fooVNode = getRoot(scratch)._children[0];
			const children = getChildren(fooVNode);
			expect(children).to.have.lengthOf(1);
			expect(children[0].props).to.equal('foo');
		});
	});

	describe('shallowEqual', () => {
		it('should compare objects', () => {
			expect(shallowEqual({ foo: 1 }, { foo: 2 })).to.equal(false);
			expect(shallowEqual({ foo: 1 }, { foo: 1 })).to.equal(true);
			expect(shallowEqual({ foo: 1, bar: 1 }, { foo: 1, bar: '2' })).to.equal(
				false
			);

			expect(shallowEqual({ foo: 1 }, { foo: 1, bar: '2' })).to.equal(false);
		});

		it('should skip children for props', () => {
			expect(
				shallowEqual({ foo: 1, children: 1 }, { foo: 1, children: '2' }, true)
			).to.equal(true);
		});
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

	describe('isRoot', () => {
		it('should check if a vnode is a root', () => {
			render(<div>Hello World</div>, scratch);
			let root = getRoot(scratch);

			expect(isRoot(root)).to.equal(true);
			expect(isRoot(root._children[0])).to.equal(false);
		});
	});

	describe('getData', () => {
		it('should convert vnode to DevtoolsData', () => {
			class App extends Component {
				render() {
					return <div>Hello World</div>;
				}
			}

			render(<App key="foo" active />, scratch);
			let vnode = getRoot(scratch)._children[0];
			vnode.startTime = 10;
			vnode.endTime = 12;

			let data = getData(vnode);

			expect(Object.keys(data.updater)).to.deep.equal([
				'setState',
				'forceUpdate',
				'setInState',
				'setInProps',
				'setInContext'
			]);
			expect(data.publicInstance instanceof App).to.equal(true);
			expect(data.children.length).to.equal(1);
			expect(data.type).to.equal(App);

			// Delete non-serializable keys for easier assertion
			delete data.updater;
			delete data.publicInstance;
			delete data.children;
			delete data.type;

			expect(data).to.deep.equal({
				name: 'App',
				nodeType: 'Composite',
				props: { active: true },
				key: 'foo',
				state: {},
				ref: null,
				text: null,
				actualStartTime: 10,
				actualDuration: 2,
				treeBaseDuration: 2,
				memoizedInteractions: []
			});
		});

		it('should inline single text child', () => {
			render(<h1>Hello World</h1>, scratch);
			let data = getData(getRoot(scratch)._children[0]);

			expect(data.children).to.equal('Hello World');
			expect(data.text).to.equal(null);
		});

		it('should convert text nodes', () => {
			render('Hello World', scratch);
			let data = getData(getRoot(scratch)._children[0]);

			expect(data.children).to.equal(null);
			expect(data.text).to.equal('Hello World');
		});
	});

	it('should not initialize hook if __REACT_DEVTOOLS_GLOBAL_HOOK__ is not set', () => {
		delete options._diff;
		delete options.diffed;
		delete /** @type {*} */ (window).__REACT_DEVTOOLS_GLOBAL_HOOK__;

		initDevTools();
		expect(options._diff).to.equal(undefined);
		expect(options.diffed).to.equal(undefined);
	});

	it('should not throw if the root is null', () => {
		expect(() => render(null, scratch)).to.not.throw();
	});

	it('should connect only once', () => {
		let rid = Object.keys(hook._renderers)[0];
		let spy = sinon.spy(hook.helpers[rid], 'markConnected');
		hook.helpers[rid] = {};
		hook.helpers[rid] = {};

		expect(spy).to.be.not.called;
	});

	describe('renderer', () => {
		let performance = window.performance;

		beforeEach(() => {
			window.performance.now = Date.now;
		});

		afterEach(() => {
			hook.clear();
			window.performance.now = performance.now;
		});

		it('should not flush events if not connected', () => {
			let spy = sinon.spy(hook, 'emit');
			let renderer = new Renderer(hook, 'abc');
			renderer.flushPendingEvents();

			expect(spy).to.not.be.called;
		});

		it('should mount a root', () => {
			render(<div>Hello World</div>, scratch);
			checkEventReferences(hook.log);

			expect(hook.log.map(x => x.type)).to.deep.equal([
				'mount',
				'mount',
				'mount',
				'root',
				'rootCommitted'
			]);
		});

		it('should not throw on empty Fragments on mount', () => {
			render(<Fragment />, scratch);
			checkEventReferences(hook.log);

			render(
				<div>
					<Fragment />
				</div>,
				scratch
			);
			checkEventReferences(hook.log);
		});

		it('should not throw on empty Fragments on update', () => {
			let setState;
			class App extends Component {
				constructor() {
					super();
					setState = this.setState.bind(this);
				}

				render() {
					return <Fragment />;
				}
			}

			class App2 extends App {
				render() {
					return (
						<div>
							<Fragment />
						</div>
					);
				}
			}

			render(<App />, scratch);
			setState({});
			rerender();

			checkEventReferences(hook.log);

			hook.clear();

			render(<App2 />, scratch);
			setState({});
			rerender();
		});

		it('should find dom node by vnode', () => {
			render(<div />, scratch);
			let vnode = getRoot(scratch);
			let rid = Object.keys(hook._renderers)[0];
			let renderer = hook._renderers[rid];
			expect(renderer.findHostInstanceByFiber(vnode)).to.equalNode(vnode._dom);
		});

		it('should find vnode by dom node', () => {
			render(<div />, scratch);
			let vnode = getRoot(scratch)._children[0];
			let rid = Object.keys(hook._renderers)[0];
			let renderer = hook._renderers[rid];

			expect(renderer.findFiberByHostInstance(scratch.firstChild)).to.equal(
				vnode
			);
		});

		it('should getNativeFromReactElement', () => {
			render(<div />, scratch);
			let vnode = getRoot(scratch);
			let rid = Object.keys(hook._renderers)[0];
			let helpers = hook.helpers[rid];
			expect(helpers.getNativeFromReactElement(vnode)).to.equalNode(vnode._dom);
		});

		it('should getReactElementFromNative', () => {
			render(<div />, scratch);
			let vnode = getRoot(scratch)._children[0];
			let rid = Object.keys(hook._renderers)[0];
			let helpers = hook.helpers[rid];
			expect(helpers.getReactElementFromNative(vnode._dom)).to.equal(vnode);

			expect(helpers.getReactElementFromNative(document.body)).to.equal(null);
		});

		it('should detect when a root is updated', () => {
			render(<div>Hello World</div>, scratch);
			checkEventReferences(hook.log);

			let prev = hook.log.slice();
			hook.clear();

			render(<div>Foo</div>, scratch);
			checkEventReferences(prev.concat(hook.log));

			expect(serialize(hook.log)).to.deep.equal([
				{ type: 'update', component: 'Fragment' },
				{ type: 'rootCommitted', component: 'Fragment' }
			]);
		});

		it('should be able to swap children', () => {
			render(<div>Hello World</div>, scratch);
			checkEventReferences(hook.log);

			let prev = hook.log.slice();
			hook.clear();

			render(
				<div>
					<span>Foo</span>
				</div>,
				scratch
			);
			checkEventReferences(prev.concat(hook.log));

			expect(serialize(hook.log)).to.deep.equal([
				{ type: 'unmount', component: '#text: Hello World' },
				{ type: 'mount', component: 'span' },
				{ type: 'update', component: 'Fragment' },
				{ type: 'rootCommitted', component: 'Fragment' }
			]);
		});

		it('should render multiple text children', () => {
			render(<div>foo{'bar'}</div>, scratch);
			checkEventReferences(hook.log);
		});

		it('should be able to swap children #2', () => {
			let updateState;
			class App extends Component {
				constructor() {
					super();
					this.state = { active: false };
					updateState = () => this.setState(prev => ({ active: !prev.active }));
				}

				render() {
					return (
						<div>
							{this.state.active && <h1>Hello World</h1>}
							<span>Foo</span>
						</div>
					);
				}
			}

			render(<App />, scratch);
			checkEventReferences(hook.log);

			let prev = hook.log.slice();
			hook.clear();

			updateState();
			rerender();
			checkEventReferences(prev.concat(hook.log));

			expect(serialize(hook.log)).to.deep.equal([
				{ type: 'mount', component: 'h1' },
				{ type: 'update', component: 'App' },
				{ type: 'rootCommitted', component: 'Fragment' }
			]);
		});

		it('should swap children #3', () => {
			function Foo(props) {
				return <div>{props.children}</div>;
			}

			let updateState;
			class App extends Component {
				constructor() {
					super();
					updateState = () => this.setState(prev => ({ active: !prev.active }));
					this.state = { active: false };
				}

				render() {
					return (
						<div>
							{this.state.active && <Foo>foo</Foo>}
							<Foo>bar</Foo>
						</div>
					);
				}
			}

			render(<App />, scratch);
			checkEventReferences(hook.log);

			expect(serialize(hook.log)).to.deep.equal([
				{ type: 'mount', component: '#text: bar' },
				{ type: 'mount', component: 'div' },
				{ type: 'mount', component: 'Foo' },
				{ type: 'mount', component: 'div' },
				{ type: 'mount', component: 'App' },
				{ type: 'mount', component: 'Fragment' },
				{ type: 'root', component: 'Fragment' },
				{ type: 'rootCommitted', component: 'Fragment' }
			]);

			let prev = hook.log.slice();
			hook.clear();

			updateState();
			rerender();
			checkEventReferences(prev.concat(hook.log));

			// We swap unkeyed children if they match by type. In this case we'll
			// use `<Foo>bar</Foo>` as the old child to diff against for
			// `<Foo>foo</Foo>`. That's why `<Foo>bar</Foo>` needs to be remounted.
			expect(serialize(hook.log)).to.deep.equal([
				{ type: 'mount', component: '#text: foo' },
				{ type: 'mount', component: 'div' },
				{ type: 'mount', component: 'Foo' },
				{ type: 'update', component: 'Foo' },
				{ type: 'update', component: 'App' },
				{ type: 'rootCommitted', component: 'Fragment' }
			]);
		});

		it('should only update profile times when nothing else changed', () => {
			render(
				<div>
					<div>
						<span>Hello World</span>
					</div>
				</div>,
				scratch
			);
			checkEventReferences(hook.log);

			let prev = hook.log.slice();
			hook.clear();

			render(
				<div>
					<div>
						<span>Foo</span>
					</div>
				</div>,
				scratch
			);
			checkEventReferences(prev.concat(hook.log));

			expect(serialize(hook.log)).to.deep.equal([
				{ type: 'update', component: 'Fragment' },
				{ type: 'rootCommitted', component: 'Fragment' }
			]);
		});

		it('should detect when a component is unmounted', () => {
			render(
				<div>
					<span>Hello World</span>
				</div>,
				scratch
			);
			checkEventReferences(hook.log);
			hook.clear();

			render(<div />, scratch);
			expect(serialize(hook.log)).to.deep.equal([
				{ type: 'unmount', component: 'span' },
				{ type: 'unmount', component: '#text: Hello World' },
				{ type: 'update', component: 'div' },
				{ type: 'update', component: 'Fragment' },
				{ type: 'rootCommitted', component: 'Fragment' }
			]);
		});

		it('should be able to render Fragments', () => {
			render(
				<div>
					<Fragment>foo{'bar'}</Fragment>
				</div>,
				scratch
			);
			checkEventReferences(hook.log);
		});

		it('should detect setState update', () => {
			let updateState;

			class Foo extends Component {
				constructor() {
					super();
					updateState = () => this.setState(prev => ({ active: !prev.active }));
				}

				render() {
					return <h1>{this.state.active ? 'foo' : 'bar'}</h1>;
				}
			}

			render(<Foo />, scratch);
			let prev = hook.log.slice();
			hook.clear();

			updateState();
			rerender();

			checkEventReferences(prev.concat(hook.log));

			// Previous `internalInstance` from mount must be referentially equal to
			// `internalInstance` from update
			hook.log
				.filter(x => x.type === 'update')
				.forEach(next => {
					let update = prev.find(
						old =>
							old.type === 'mount' &&
							old.internalInstance === next.internalInstance
					);

					expect(update).to.not.equal(undefined);

					// ...and the same rules apply for `data.children`. Note that
					// `data.children`is not always an array.
					let children = update.data.children;
					if (Array.isArray(children)) {
						children.forEach(child => {
							let prevChild = prev.find(x => x.internalInstance === child);
							expect(prevChild).to.not.equal(undefined);
						});
					}
				});
		});

		it('must send an update event for the component setState/forceUpdate was called on', () => {
			let updateState;

			class Foo extends Component {
				constructor() {
					super();
					this.state = { active: true };
					updateState = () => this.setState(prev => ({ active: !prev.active }));
				}
				render() {
					return <h1>{this.state.active ? 'foo' : 'bar'}</h1>;
				}
			}

			render(
				<div>
					<Foo />
				</div>,
				scratch
			);
			hook.clear();

			updateState();
			rerender();

			expect(serialize(hook.log)).to.deep.equal([
				{ type: 'update', component: 'Foo' },
				{ type: 'rootCommitted', component: 'Fragment' }
			]);
		});

		describe('updater', () => {
			it('should update state', () => {
				class App extends Component {
					constructor() {
						super();
						this.state = { active: true };
					}

					render() {
						return <h1>{this.state.active ? 'foo' : 'bar'}</h1>;
					}
				}
				render(<App />, scratch);
				expect(scratch.textContent).to.equal('foo');

				let event = hook.log.find(x => x.data.publicInstance instanceof App);
				event.data.updater.setInState(['active'], false);
				rerender();

				checkEventReferences(hook.log);

				expect(scratch.textContent).to.equal('bar');
			});

			it('should update props', () => {
				function App(props) {
					return <h1>{props.active ? 'foo' : 'bar'}</h1>;
				}
				render(<App active />, scratch);
				expect(scratch.textContent).to.equal('foo');

				let event = hook.log.find(
					x => x.data.publicInstance instanceof Component
				);
				event.data.updater.setInProps(['active'], false);
				rerender();

				expect(scratch.textContent).to.equal('bar');
			});

			it('should update context', () => {
				class Wrapper extends Component {
					getChildContext() {
						return { active: true };
					}

					render() {
						return <div>{this.props.children}</div>;
					}
				}

				class App extends Component {
					constructor() {
						super();
						this.context = { active: true };
					}

					render() {
						return <h1>{this.context.active ? 'foo' : 'bar'}</h1>;
					}
				}
				render(
					<Wrapper>
						<App />
					</Wrapper>,
					scratch
				);
				expect(scratch.textContent).to.equal('foo');

				let event = hook.log.find(x => x.data.publicInstance instanceof App);
				event.data.updater.setInContext(['active'], false);
				rerender();

				checkEventReferences(hook.log);

				expect(scratch.textContent).to.equal('bar');
			});
		});

		describe('Profiler', () => {
			it('should collect timings', () => {
				render(<div>Hello World</div>, scratch);

				// Filter out root node which doesn't need to have timings
				const events = hook.log.filter(x => x.type == 'mount');
				events.splice(-1, 1);

				events.forEach(ev => {
					expect(ev.data.actualStartTime > 0).to.equal(true);
				});
			});

			it('should calculate treeBaseDuration', () => {
				render(<div>Hello World</div>, scratch);

				// Filter out root node which doesn't need to have timings
				const events = hook.log.filter(x => x.type == 'mount');
				events.splice(-1, 1);

				events.forEach(ev => {
					expect(ev.data.treeBaseDuration > -1).to.equal(true);
				});
			});
		});

		// preact/#1490
		it('should not crash on a Portal node', () => {
			const div = document.createElement('div');
			render(createPortal('foo', div), scratch);
			expect(console.error).to.not.be.called;
		});
	});
});
