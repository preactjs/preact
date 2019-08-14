import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { render, h, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { createMockDevtoolsHook, parseEmit } from './mock-hook';
import { initDevTools } from '../../../src/devtools';
import { clearState } from '../../../src/devtools/cache';
import { inspectHooks } from '../../../src/devtools/hooks';

/** @jsx h */

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {import('../../../src/internal').DevtoolsMock} */
	let mock;

	let teardownDevtools;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		mock = createMockDevtoolsHook();

		teardownDevtools = initDevTools();
		clearState();
	});

	afterEach(() => {
		teardown(scratch);
		teardownDevtools();
	});

	it.skip('should not sent events before marked as connected', () => {
		// TODO
	});

	it('should mount a functional component', () => {
		mock.connect();

		function App() {
			return <h1>Hello World</h1>;
		}

		render(<App />, scratch);
		expect(mock.hook.emit).to.be.calledOnce;

		expect(parseEmit(mock.hook.emit.args[0])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			4, // string table length
			3, // next string length
			65, // A
			112, // p
			112, // p
			1, // TREE_OPERATION_ADD
			1, // vnode id
			11, // ElementTypeRoot -> Fragment
			1, // isProfilingSupported
			1, // hasOwnerMetaData
			1, // TREE_OPERATION_ADD -> App
			2, //   vnode id
			5, //   ElementTypeFunction
			1, //   parent id
			0, //   owner id
			1, //   displayName string id
			0  //   key string id
		]);
	});

	// Works when singled out, options environment is not cleaned up properly
	it('should mount nested functional components', () => {
		mock.connect();

		function Foo() {
			return 'foo';
		}

		function App() {
			return <h1><Foo /></h1>;
		}

		render(<App />, scratch);

		expect(mock.hook.emit).to.be.calledOnce;
		expect(parseEmit(mock.hook.emit.args[0])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			8, // string table length
			3, // next string length
			65, // A
			112, // p
			112, // p
			3, // next string length
			70, // F
			111, // o
			111, // o
			1, // TREE_OPERATION_ADD
			1, // vnode id
			11, // ElementTypeRoot -> Fragment
			1, // isProfilingSupported
			1, // hasOwnerMetaData
			1, // TREE_OPERATION_ADD -> App
			2, //   vnode id
			5, //   ElementTypeFunction
			1, //   parent id
			0, //   owner id
			1, //   displayName string id
			0, //   key string id
			1, // TREE_OPERATION_ADD -> Foo
			3, //   vnode id
			5, //   ElementTypeFunction
			2, //   parent id
			2, //   owner id
			2, //   displayName string id
			0  //   key string id
		]);
	});

	it('should unmount component', () => {
		mock.connect();

		function Foo() {
			return 'foo';
		}

		let update;
		function App() {
			let [v, setter] = useState(true);
			update = () => setter(!v);
			return (
				<div>
					<button>toggle</button>
					{v && <Foo />}
				</div>
			);
		}
		render(<App />, scratch);

		expect(mock.hook.emit).to.be.calledOnce;
		expect(parseEmit(mock.hook.emit.args[0])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			8, // string table length
			3, // next string length
			65, // A
			112, // p
			112, // p
			3, // next string length
			70, // F
			111, // o
			111, // o
			1, // TREE_OPERATION_ADD
			1, // vnode id
			11, // ElementTypeRoot -> Fragment
			1, // isProfilingSupported
			1, // hasOwnerMetaData
			1, // TREE_OPERATION_ADD -> App
			2, //   vnode id
			5, //   ElementTypeFunction
			1, //   parent id
			0, //   owner id
			1, //   displayName string id
			0, //   key string id
			1, // TREE_OPERATION_ADD -> Foo
			3, //   vnode id
			5, //   ElementTypeFunction
			2, //   parent id
			2, //   owner id
			2, //   displayName string id
			0  //   key string id
		]);

		// unmount
		update();
		rerender();

		expect(mock.hook.emit).to.be.calledTwice;
		expect(parseEmit(mock.hook.emit.args[1])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			0, // string table length
			2, // TREE_OPERATION_REMOVE -> Foo
			1, //   number of vnodes to unmount
			3  //   vnode id
		]);

		// Update again
		update();
		rerender();

		expect(mock.hook.emit).to.be.called.calledThrice;
		expect(parseEmit(mock.hook.emit.args[2])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			4, // string table length
			3, // next string length
			70, // F
			111, // o
			111, // o
			1, // TREE_OPERATION_ADD -> Foo
			4, //   vnode id
			5, //   ElementTypeFunction
			2, //   parent id
			2, //   owner id
			1, //   displayName string id
			0  //   key string id
		]);
	});

	it('should reorder keyed children', () => {
		mock.connect();

		function Foo() {
			return <div>foo</div>;
		}

		function Bar() {
			return <div>bar</div>;
		}

		function FakeRouter(props) {
			return props.active ? props.children : [...props.children].reverse();
		}

		let update;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = { active: true };
				update = () => this.setState(prev => ({ active: !prev.active }));
			}
			render() {
				return (
					<FakeRouter active={this.state.active}>
						<Foo key="a" />
						<Bar key="b" />
					</FakeRouter>
				);
			}
		}

		render(<App />, scratch);
		expect(mock.hook.emit).to.be.calledOnce;
		update();
		rerender();

		expect(mock.hook.emit).to.be.calledTwice;
		expect(parseEmit(mock.hook.emit.args[1])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			0, // string table lengthl
			3, // TREE_OPERATION_REORDER_CHILDREN
			3, //   parent vnode id
			2, //   children count
			5, //   vnode id
			4  //   vnode id
		]);
	});

	// Works when singled out, options environment is not cleaned up properly
	it('should replace component', () => {
		mock.connect();

		function Foo() {
			return 'foo';
		}

		function Baz() {
			return <div>baz</div>;
		}

		function Bar() {
			return <Baz />;
		}

		let update;
		function App() {
			let [v, setter] = useState(true);
			update = () => setter(!v);
			return (
				<div>
					<button>toggle</button>
					{v ? <Foo /> : <Bar />}
				</div>
			);
		}
		render(<App />, scratch);

		expect(mock.hook.emit).to.be.calledOnce;
		expect(parseEmit(mock.hook.emit.args[0])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			8, // string table length
			3, // next string length
			65, // A
			112, // p
			112, // p
			3, // next string length
			70, // F
			111, // o
			111, // o
			1, // TREE_OPERATION_ADD
			1, // vnode id
			11, // ElementTypeRoot -> Fragment
			1, // isProfilingSupported
			1, // hasOwnerMetaData
			1, // TREE_OPERATION_ADD -> App
			2, //   vnode id
			5, //   ElementTypeFunction
			1, //   parent id
			0, //   owner id
			1, //   displayName string id
			0, //   key string id
			1, // TREE_OPERATION_ADD -> Foo
			3, //   vnode id
			5, //   ElementTypeFunction
			2, //   parent id
			2, //   owner id
			2, //   displayName string id
			0  //   key string id
		]);

		// unmount
		update();
		rerender();

		expect(mock.hook.emit).to.be.calledTwice;
		expect(parseEmit(mock.hook.emit.args[1])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			8, // string table length
			3, // next string length
			66, // B
			97, // a
			114, // r
			3, // next string length
			66, // B
			97, // a
			122, // z
			2, // TREE_OPERATION_REMOVE -> Foo
			1, //   number of vnodes to unmount
			3, //   vnode id
			1, // TREE_OPERATION_ADD -> Bar
			4, //   vnode id
			5, //   ElementTypeFunction
			2, //   parent id
			2, //   owner id
			1, //   displayName string id
			0, //   key string id
			1, // TREE_OPERATION_ADD -> Baz
			5, //   vnode id
			5, //   ElementTypeFunction
			4, //   parent id
			4, //   owner id
			2, //   displayName string id
			0  //   key string id
		]);

		// Update again
		update();
		rerender();

		expect(mock.hook.emit).to.be.called.calledThrice;
		expect(parseEmit(mock.hook.emit.args[2])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			4, // string table length
			3, // next string length
			70, // F
			111, // o
			111, // o
			2, // TREE_OPERATION_REMOVE -> Bar -> Baz
			2, //   number of vnodes to unmount
			5, //   vnode id
			4, //   vnode id
			1, // TREE_OPERATION_ADD -> Foo
			6, //   vnode id
			5, //   ElementTypeFunction
			2, //   parent id
			2, //   owner id
			1, //   displayName string id
			0  //   key string id
		]);
	});

	it('should update in place children', () => {
		mock.connect();

		function Foo() {
			return <Bob />;
		}

		function Bar() {
			return <Bob />;
		}

		let i = 0;
		function Bob() {
			return <div>bob {++i}</div>;
		}

		function FakeRouter(props) {
			return props.active ? props.children[0] : props.children[1];
		}

		let update;
		function App() {
			let [v, setValue] = useState(true);
			update = () => setValue(!v);

			return (
				<FakeRouter active={v}>
					<Foo />
					<Bar />
				</FakeRouter>
			);
		}

		render(<App />, scratch);
		update();
		rerender();

		// let mount = [1, 1, 28, 4, 65, 112, 112, 50, 4, 76, 105, 110, 107, 6, 82, 111, 117, 116, 101, 114, 3, 70, 111, 111, 2, 46, 48, 3, 66, 111, 98, 2, 0, 1, 1, 10, 1, 1, 1, 2, 4, 1, 0, 1, 0, 1, 3, 4, 2, 2, 2, 0, 1, 4, 4, 2, 2, 2, 0, 1, 5, 1, 2, 2, 3, 0, 1, 6, 4, 5, 2, 4, 5, 1, 7, 4, 6, 6, 6, 0];
		// let update = [1, 1, 11, 3, 66, 97, 114, 2, 46, 49, 3, 66, 111, 98, 2, 2, 7, 6, 1, 8, 4, 5, 2, 1, 2, 1, 9, 4, 8, 8, 3, 0];
		expect(parseEmit(mock.hook.emit.args[1])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			8, // string table length
			3, // next string length
			66, // B
			97, // a
			114, // r
			3, // next string length
			66, // B
			111, // o
			98, // b
			2, // TREE_OPERATION_REMOVE -> Foo
			2, //   number of vnodes to unmount
			5, //   vnode id
			4, //   vnode id
			1, // TREE_OPERATION_ADD -> Bar
			6, //   vnode id
			5, //   ElementTypeFunction
			3, //   parent id
			3, //   owner id // TODO: The react devtools use vnode 2 as an owner?
			1, //   displayName string id
			0, //   key string id
			1, // TREE_OPERATION_ADD -> Bob
			7, //   vnode id
			5, //   ElementTypeFunction
			6, //   parent id
			6, //   owner id
			2, //   displayName string id
			0  //   key string id
		]);

		update();
		rerender();

		expect(parseEmit(mock.hook.emit.args[2])).to.deep.equal([
			1, // rendererId
			1, // root vnode id
			8, // string table length
			3, // next string length
			70, // F
			111, // o
			111, // o
			3, // next string length
			66, // B
			111, // o
			98, // b
			2, // TREE_OPERATION_REMOVE -> Bar
			2, //   number of vnodes to unmount
			7, //   vnode id
			6, //   vnode id
			1, // TREE_OPERATION_ADD -> Foo
			8, //   vnode id
			5, //   ElementTypeFunction
			3, //   parent id
			3, //   owner id // TODO: devtools wants owner 2?
			1, //   displayName string id
			0, //   key string id
			1, // TREE_OPERATION_ADD -> Bob
			9, //   vnode id
			5, //   ElementTypeFunction
			8, //   parent id
			8, //   owner id
			2, //   displayName string id
			0  //   key string id
		]);
	});

	it('should apply filters', () => {
		mock.connect();

		function Foo() {
			return <div>foo</div>;
		}

		function App() {
			return <Foo />;
		}

		render(<App />, scratch);

		// HTML elements are filtered by default. We disable that filter here
		mock.applyFilters([]);

		expect(parseEmit(mock.hook.emit.args[1])).to.deep.equal([
			1, // rendererId
			4, // root vnode id
			12, // string table length
			3, // next string length
			65, // A
			112, // p
			112, // p
			3, // next string length
			70, // F
			111, // o
			111, // o
			3, // next string length
			100, // d
			105, // i
			118, // v
			2, // TREE_OPERATION_REMOVE
			3, //   number of vnodes to unmount
			3, //   vnode id
			2, //   vnode id
			1, //   vnode id
			1, // TREE_OPERATION_ADD -> Root Fragment
			4, //   vnode id
			11, //  ElementTypeRoot
			1, //   isProfilingSupported
			1, //   hasOwnerMetadata
			1, // TREE_OPERATION_ADD -> App
			5, //   vnode id
			5, //   ElementTypeFunction
			4, //   parent id
			0, //   owner id
			1, //   displayName string id
			0, //   key string id
			1, // TREE_OPERATION_ADD -> Foo
			6, //   vnode id
			5, //   ElementTypeFunction
			5, //   parent id
			5, //   owner id
			2, //   displayName string id
			0, //   key string id
			1, // TREE_OPERATION_ADD -> div
			7, //   vnode id
			7, //   ElementTypeHostComponent
			6, //   parent id
			6, //   owner id
			3, //   displayName string id
			0 //    key string id
		]);
	});

	it('should mount + unmount components', () => {
		mock.connect();

		function Foo() {
			return <Bar />;
		}

		function Bar() {
			return <Bob />;
		}

		function Bob() {
			return <div>bob</div>;
		}

		let updateState;
		function App2() {
			let [v, update] = useState(true);
			updateState = update;
			return v ? <Foo /> : null;
		}

		render(<App2 />, scratch);
		updateState();
		rerender();

		expect(parseEmit(mock.hook.emit.args[1])).to.deep.equal([
			 1,
			 1,
			 0,
			 2,
			 3,
			 5,
			 4,
			 3
		]);
	});

	describe('inspectElement', () => {
		it('should provide props', () => {
			mock.connect();
			let App = () => <div />;
			render(<App foo bar="bar" bob={2} baz={{ foo: 1 }} boof={[1]} />, scratch);

			expect(mock.inspect(2).value.props).to.deep.equal({
				cleaned: [],
				data: {
					foo: true,
					bar: 'bar',
					baz: {
						foo: 1
					},
					bob: 2,
					boof: [1]
				}
			});
		});

		it('should not provide state for functional components', () => {
			mock.connect();
			let App = () => <div />;
			render(<App />, scratch);
			expect(mock.inspect(2).value.state).to.equal(null);
		});

		it('should provide state for class components', () => {
			mock.connect();
			class App extends Component {
				constructor(props) {
					super(props);
					this.state = { foo: 1 };
				}
				render() {
					return <div />;
				}
			}

			render(<App />, scratch);

			expect(mock.inspect(2).value.state).to.deep.equal({
				cleaned: [],
				data: {
					foo: 1
				}
			});
		});

		it('should edit state', () => {
			mock.connect();
			class App extends Component {
				constructor(props) {
					super(props);
					this.state = { foo: 1 };
				}
				render() {
					return <div />;
				}
			}

			render(<App />, scratch);

			expect(mock.inspect(2).value.state).to.deep.equal({
				cleaned: [],
				data: {
					foo: 1
				}
			});

			mock.setState(2, ['foo'], 42);
			rerender();

			expect(mock.inspect(2).value.state).to.deep.equal({
				cleaned: [],
				data: {
					foo: 42
				}
			});
		});
	});

	// Any stack traces are mapped wrongly with our setup. This seems to be a bug
	// in babel. We rely on correct stack traces to detect user defined hooks.
	// See this issue: https://github.com/babel/babel/issues/9883
	describe.skip('inspectHooks', () => {
		it('should detect hook', () => {
			function Foo() {
				let [v] = useState(0);
				return <div>{v}</div>;
			}

			render(<Foo />, scratch);
			let vnode = scratch._prevVNode._children[0];
			expect(inspectHooks(vnode)).to.deep.equal({
				id: 0,
				name: 'state',
				value: 0,
				subHooks: []
			});
		});
	});
});
