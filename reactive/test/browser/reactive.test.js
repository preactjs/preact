/* eslint-disable react/display-name */
import { createElement, render, Component, createContext } from 'preact';
import { component, signal, computed, inject } from 'preact/reactive';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

describe('Reactive', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('component', () => {
		it('should pass props', () => {
			let usedProps;
			const App = component(props => {
				usedProps = props;
				return <div />;
			});

			render(<App foo="foo" />, scratch);
			expect(usedProps).to.deep.equal({ foo: 'foo' });

			render(<App bar="bar" />, scratch);
			expect(usedProps).to.deep.equal({ bar: 'bar' });
		});

		it('should not call unsubscribed computed atoms', () => {
			let count = 0;
			const App = component(() => {
				computed(() => count++);
				return <div />;
			});

			render(<App />, scratch);
			expect(count).to.equal(0);

			render(<App foo="foo" />, scratch);
			expect(count).to.equal(0);
		});

		it('should unsubscribe from stale subscriptions', () => {
			let update;
			let updateFoo;

			let count = 0;
			const App = component(() => {
				const [num, setNum] = signal(0, 'num');
				const [foo, setFoo] = signal('foo', 'foo');
				const [bar] = signal('bar', 'bar');

				update = setNum;
				updateFoo = setFoo;

				count++;
				const v = num.value % 2 === 0 ? foo.value : bar.value;
				return <div>{v}</div>;
			});

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');

			update(1);
			rerender();
			expect(count).to.equal(2);

			updateFoo('foo2');
			rerender();
			expect(count).to.equal(2);
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});

		it('should drop reactions on unmount', () => {
			let updateName;
			let count = 0;
			const Inner = component(() => {
				const [name, setName] = signal('foo');
				updateName = setName;

				count++;
				return <div>{name.value}</div>;
			});

			let updateOuter;
			class Outer extends Component {
				constructor(props) {
					super(props);
					updateOuter = v => this.setState({ v });
					this.state = { v: 0 };
				}

				render() {
					return this.state.v % 2 === 0 ? <Inner /> : <i>bar</i>;
				}
			}

			render(<Outer />, scratch);
			expect(scratch.textContent).to.equal('foo');
			expect(count).to.equal(1);

			updateOuter();
			rerender();
			expect(scratch.textContent).to.equal('bar');
			expect(count).to.equal(1);

			updateName('hehe');
			rerender();
			expect(count).to.equal(1);
		});

		it('should throw errors as part of render context', () => {
			let updateName;
			const Inner = component(() => {
				const [name, setName] = signal('foo');
				updateName = setName;

				const foo = computed(() => {
					if (name.value === 'fail') {
						throw new Error('errored');
					}

					return name.value;
				});

				return <div>{foo.value}</div>;
			});

			class Outer extends Component {
				constructor(props) {
					super(props);
					this.state = { error: null };
				}

				componentDidCatch(error) {
					this.setState({ error });
				}

				render() {
					return this.state.error ? (
						<div>{this.state.error.message}</div>
					) : (
						<Inner />
					);
				}
			}

			render(<Outer />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');

			updateName('fail');
			rerender();
			expect(scratch.innerHTML).to.equal('<div>errored</div>');
		});

		describe('displayName', () => {
			it('should set default if none specified', () => {
				const App = component(() => {
					return <div>foo</div>;
				});

				render(<App />, scratch);
				const atom = scratch._children._children[0]._component.__reactive;
				expect(atom.displayName).to.match(/^ReactiveComponent_\d+$/);
			});

			it('should use function name', () => {
				const App = component(function Foo() {
					return <div>foo</div>;
				});

				render(<App />, scratch);
				const atom = scratch._children._children[0]._component.__reactive;
				expect(atom.displayName).to.match(/^Foo_\d+$/);
			});

			it('should use component displayName', () => {
				const App = component(function Foo() {
					return <div>foo</div>;
				});
				App.displayName = 'App';

				render(<App />, scratch);
				const atom = scratch._children._children[0]._component.__reactive;
				expect(atom.displayName).to.match(/^Foo_\d+$/);
			});
		});
	});

	describe('signals', () => {
		it('should render signal value', () => {
			const App = component(() => {
				const [name] = signal('foo');
				return <div>{name.value}</div>;
			});

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
		});

		describe('displayName', () => {
			it('should set default if none specified', () => {
				let atom;
				const App = component(() => {
					const [name] = signal('foo');
					atom = name;
					return <div>{name.value}</div>;
				});

				render(<App />, scratch);
				expect(atom.displayName).to.match(/^_\d+$/);
			});

			it('should use passed value', () => {
				let atom;
				const App = component(() => {
					const [name] = signal('foo', 'foo');
					atom = name;
					return <div>{name.value}</div>;
				});

				render(<App />, scratch);
				expect(atom.displayName).to.match(/^foo_\d+$/);
			});
		});

		describe('updater', () => {
			it('should update signal value', () => {
				let update;
				const App = component(() => {
					const [name, setName] = signal('foo');
					update = setName;
					return <div>{name.value}</div>;
				});

				render(<App />, scratch);
				update('bar');
				rerender();
				expect(scratch.innerHTML).to.equal('<div>bar</div>');
			});

			it('should NOT update when signal is not used', () => {
				let update;

				const Inner = component(props => {
					return <div>{props.name.value}</div>;
				});

				let count = 0;
				const App = component(() => {
					const [name, setName] = signal('foo');
					update = setName;
					count++;
					return <Inner name={name} />;
				});

				render(<App />, scratch);
				expect(scratch.innerHTML).to.equal('<div>foo</div>');
				expect(count).to.equal(1);

				update('bar');
				rerender();
				expect(scratch.innerHTML).to.equal('<div>bar</div>');
				expect(count).to.equal(1);
			});

			it('should update signal via updater function', () => {
				let update;
				const App = component(() => {
					const [name, setName] = signal('foo');
					update = setName;
					return <div>{name.value}</div>;
				});

				render(<App />, scratch);
				update(prev => prev + 'bar');
				rerender();
				expect(scratch.innerHTML).to.equal('<div>foobar</div>');
			});

			it('should abort signal update in updater function', () => {
				let update;
				const App = component(() => {
					const [name, setName] = signal('foo');
					update = setName;
					return <div>{name.value}</div>;
				});

				render(<App />, scratch);
				update(() => null);
				rerender();
				expect(scratch.innerHTML).to.equal('<div>foo</div>');
			});
		});
	});

	describe('computed', () => {
		it('should return atom', () => {
			const App = component(() => {
				const [name] = signal('foo');
				const bar = computed(() => name.value);
				return <div>{bar.value}</div>;
			});

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
		});

		it('should rerun on update', () => {
			let update;
			const App = component(() => {
				const [name, updateName] = signal('foo');
				update = updateName;
				const bar = computed(() => name.value);
				return <div>{bar.value}</div>;
			});

			render(<App />, scratch);
			update('bar');
			rerender();
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});

		it('should only update once', () => {
			let update;
			let count = 0;
			const App = component(() => {
				const [name, updateName] = signal('foo');
				update = updateName;
				const a = computed(() => name.value + 'A');
				const b = computed(() => name.value + 'B');
				const c = computed(() => {
					count++;
					return a.value + ' ' + b.value;
				});

				return <div>{c.value}</div>;
			});

			render(<App />, scratch);
			expect(count).to.equal(1);

			update('bar');
			rerender();
			expect(count).to.equal(2);
		});

		it('should skip updates if signal value did not change', () => {
			let update;
			let count = 0;
			const App = component(() => {
				const [i, setI] = signal(0);
				update = setI;
				const sum = computed(() => {
					count++;
					return i.value;
				});

				return <div>{sum.value}</div>;
			});

			render(<App />, scratch);
			expect(count).to.equal(1);

			update(0);
			rerender();
			expect(count).to.equal(1);
		});

		it('should skip updates if computed result did not change', () => {
			let update;
			let count = 0;
			const App = component(() => {
				const [i, setI] = signal(0, 'i');
				update = setI;
				const tmp = computed(() => (i.value > 10 ? 'foo' : 'bar'), 'tmp');
				const sum = computed(() => {
					count++;
					return tmp.value;
				}, 'sum');

				return <div>{sum.value}</div>;
			});

			render(<App />, scratch);
			expect(count).to.equal(1);

			update(1);
			rerender();
			expect(count).to.equal(1);
		});

		it('should throw when a signal is updated inside computed', () => {
			const App = component(() => {
				const [name] = signal('foo');
				const [_, setNope] = signal('foo');
				const bar = computed(() => {
					setNope(name.value);
					return name.value;
				});
				return <div>{bar.value}</div>;
			});

			expect(() => render(<App />, scratch)).to.throw(/Must not/);
		});

		describe('displayName', () => {
			it('should use default if not specified', () => {
				let atom;
				const App = component(() => {
					const [name] = signal('foo');
					const bar = computed(() => name.value);
					atom = bar;
					return <div>{bar.value}</div>;
				});

				render(<App />, scratch);
				expect(atom.displayName).to.match(/^_\d+$/);
			});

			it('should use passed name', () => {
				let atom;
				const App = component(() => {
					const [name] = signal('foo');
					const bar = computed(() => name.value, 'bar');
					atom = bar;
					return <div>{bar.value}</div>;
				});

				render(<App />, scratch);
				expect(atom.displayName).to.match(/^bar_\d+$/);
			});
		});
	});

	describe('inject', () => {
		it('should read default value from context', () => {
			const Ctx = createContext('foo');

			const App = component(() => {
				const name = inject(Ctx);
				return <div>{name.value}</div>;
			});

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
		});

		it('should read from context', () => {
			const Ctx = createContext('foo');

			const Inner = component(() => {
				const name = inject(Ctx);
				return <div>{name.value}</div>;
			});

			function App() {
				return (
					<Ctx.Provider value="bar">
						<Inner />
					</Ctx.Provider>
				);
			}

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});

		it('should subscribe to updates from context', () => {
			const Ctx = createContext('foo');

			const Inner = component(() => {
				const name = inject(Ctx);
				return <div>{name.value}</div>;
			});

			class Blocker extends Component {
				shouldComponentUpdate() {
					return false;
				}

				render() {
					return <Inner />;
				}
			}

			let update;
			const App = component(() => {
				const [ctx, setCtx] = signal('foo');
				update = setCtx;
				return (
					<Ctx.Provider value={ctx.value}>
						<Blocker />
					</Ctx.Provider>
				);
			});

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');

			update('bar');
			rerender();
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});

		it('should only update if context value is used', () => {
			const Ctx = createContext('foo');

			let count = 0;
			const Inner = component(() => {
				inject(Ctx); // unused
				return <div>{count++}</div>;
			});

			class Blocker extends Component {
				shouldComponentUpdate() {
					return false;
				}

				render() {
					return <Inner />;
				}
			}

			let update;
			const App = component(() => {
				const [ctx, setCtx] = signal('foo');
				update = setCtx;
				return (
					<Ctx.Provider value={ctx.value}>
						<Blocker />
					</Ctx.Provider>
				);
			});

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>0</div>');

			update('bar');
			rerender();
			expect(scratch.innerHTML).to.equal('<div>0</div>');
		});
	});
});
