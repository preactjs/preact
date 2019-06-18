import { setupScratch, teardown } from '../../../test/_util/helpers';
import { render, h, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { createMockDevtoolsHook, convertEmit } from './mock-hook';
import { initDevTools } from '../../src/devtools';
import { clearState } from '../../src/devtools/cache';
import { inspectHooks } from '../../src/devtools/hooks';
import { clearStringTable } from '../../src/devtools/string-table';

/** @jsx h */

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {import('../../src/internal').DevtoolsMock} */
	let mock;

	let teardownDevtools;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		mock = createMockDevtoolsHook();

		teardownDevtools = initDevTools();
		clearState();
		clearStringTable();
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

		expect(Array.from(mock.hook.emit.args[0][1])).to.deep.equal([
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
		expect(Array.from(mock.hook.emit.args[0][1])).to.deep.equal([
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

	// Works when singled out, options environment is not cleaned up properly
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
		expect(Array.from(mock.hook.emit.args[0][1])).to.deep.equal([
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
		expect(Array.from(mock.hook.emit.args[1][1])).to.deep.equal([
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
		expect(Array.from(mock.hook.emit.args[2][1])).to.deep.equal([
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
		expect(Array.from(mock.hook.emit.args[0][1])).to.deep.equal([
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
		expect(Array.from(mock.hook.emit.args[1][1])).to.deep.equal([
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
		expect(Array.from(mock.hook.emit.args[2][1])).to.deep.equal([
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

	it.skip('should work with router', () => {
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
		function App2() {
			let [v, setValue] = useState(true);
			update = () => setValue(!v);

			return (
				<FakeRouter active={v}>
					<Foo />
					<Bar />
				</FakeRouter>
			);
		}

		render(<App2 />, scratch);
		update();
		rerender();

		// let mount = [1, 1, 28, 4, 65, 112, 112, 50, 4, 76, 105, 110, 107, 6, 82, 111, 117, 116, 101, 114, 3, 70, 111, 111, 2, 46, 48, 3, 66, 111, 98, 2, 0, 1, 1, 10, 1, 1, 1, 2, 4, 1, 0, 1, 0, 1, 3, 4, 2, 2, 2, 0, 1, 4, 4, 2, 2, 2, 0, 1, 5, 1, 2, 2, 3, 0, 1, 6, 4, 5, 2, 4, 5, 1, 7, 4, 6, 6, 6, 0];
		// let update = [1, 1, 11, 3, 66, 97, 114, 2, 46, 49, 3, 66, 111, 98, 2, 2, 7, 6, 1, 8, 4, 5, 2, 1, 2, 1, 9, 4, 8, 8, 3, 0];
		expect(convertEmit(mock.hook.emit.args[0])).to.deep.equal({
			rendererId: 1,
			rootVNodeId: 1,
			stringTable: {
				length: 24,
				items: ['App2', 'FakeRouter', 'Foo', 'Bob']
			},
			unmounts: [],
			operations: [
				{
					type: 'ADD',
					id: 1,
					kind: 'Root',
					supportsProfiling: true,
					hasOwnerMetadata: false
				},
				{
					type: 'ADD',
					id: 2,
					kind: 'FunctionalComponent',
					parentId: 1,
					owner: 0,
					name: 'App2',
					key: null
				},
				{
					type: 'ADD',
					id: 3,
					kind: 'FunctionalComponent',
					parentId: 2,
					owner: 2,
					name: 'FakeRouter',
					key: null
				},
				{
					type: 'ADD',
					id: 4,
					kind: 'FunctionalComponent',
					parentId: 3,
					owner: 3, // FIXME: should be 2
					name: 'Foo',
					key: null
				},
				{
					type: 'ADD',
					id: 5,
					kind: 'FunctionalComponent',
					parentId: 4,
					owner: 4,
					name: 'Bob',
					key: null
				}
			]
		});

		expect(convertEmit(mock.hook.emit.args[1])).to.deep.equal({
			rendererId: 1,
			rootVNodeId: 1,
			stringTable: { length: 8, items: ['Bar', 'Bob'] },
			unmounts: [5, 4],
			operations: [
				{
					type: 'ADD',
					id: 6,
					kind: 'FunctionalComponent',
					parentId: 3,
					owner: 3, // FIXME: Should be 2
					name: 'Bar',
					key: null
				},
				{
					type: 'ADD',
					id: 7,
					kind: 'FunctionalComponent',
					parentId: 6,
					owner: 6,
					name: 'Bob',
					key: null
				}
			]
		});
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

		expect(Array.from(mock.hook.emit.args[1][1])).to.deep.equal([
			 1,
			 1,
			 0,
			 2,
			 3,
			 5,
			 4,
			 3
		]);
		expect(convertEmit(mock.hook.emit.args[1])).to.deep.equal({
			operations: [],
			rendererId: 1,
			rootVNodeId: 1,
			stringTable: {
				items: [],
				length: 0
			},
			unmounts: [5, 4, 3]
		});
	});

	describe('inspectElement', () => {
		it('should provide props', () => {
			mock.connect();
			let App = props => <div />;
			render(<App foo bar="bar" bob={2} baz={{ foo: 1 }} boof={[1]} />, scratch);

			expect(mock.inspect(2).props).to.deep.equal({
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
			expect(mock.inspect(2).state).to.equal(null);
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

			expect(mock.inspect(2).state).to.deep.equal({
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

			expect(mock.inspect(2).state).to.deep.equal({
				cleaned: [],
				data: {
					foo: 1
				}
			});

			mock.setState(2, ['foo'], 42);
			rerender();

			expect(mock.inspect(2).state).to.deep.equal({
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
