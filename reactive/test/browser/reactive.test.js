/* eslint-disable react/display-name */
import {
	createElement,
	render,
	Component,
	createContext,
	options
} from 'preact';
import {
	signal,
	computed,
	inject,
	effect,
	readonly,
	ref,
	$
} from 'preact/reactive';
import { act, setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

/**
 * @template T
 * @typedef {import('preact/reactive').StateUpdater<T>} Updater
 */

function scheduleEffectAssert(assertFn) {
	return new Promise(resolve => {
		requestAnimationFrame(() =>
			setTimeout(() => {
				assertFn();
				resolve();
			}, 0)
		);
	});
}

class ErrorBoundary extends Component {
	static getDerivedStateFromError(err) {
		return { err };
	}

	render() {
		if (this.state.err) {
			return <p>{this.state.err.message}</p>;
		}

		return this.props.children;
	}
}

describe.only('Reactive', () => {
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
		it('should return signal value', () => {
			function App() {
				const [foo] = signal('foo');
				return <div>{foo()}</div>;
			}

			render(<App />, scratch);
			expect(scratch.textContent).to.equal('foo');
		});

		it('should trigger state update', () => {
			/** @type {Updater<string>} */
			let update;
			function App() {
				const [foo, setFoo] = signal('foo');
				update = setFoo;
				return $(() => <div>{foo()}</div>);
			}

			render(<App />, scratch);

			update('bar');
			rerender();
			expect(scratch.textContent).to.equal('bar');
		});

		it('should not call unsubscribed computed atoms', () => {
			let count = 0;

			/** @type {(props: { foo?: string }) => any} */
			function App(props) {
				computed(() => count++);
				return <div />;
			}

			render(<App />, scratch);
			expect(count).to.equal(0);

			render(<App foo="foo" />, scratch);
			expect(count).to.equal(0);
		});

		it('should unsubscribe from stale subscriptions', () => {
			/** @type {Updater<number>} */
			let update;
			/** @type {Updater<string>} */
			let updateFoo;

			let count = 0;
			function App() {
				const [num, setNum] = signal(0, 'num');
				const [foo, setFoo] = signal('foo', 'foo');
				const [bar] = signal('bar', 'bar');

				update = setNum;
				updateFoo = setFoo;

				count++;
				const v = num() % 2 === 0 ? foo() : bar();
				return <div>{v}</div>;
			}

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
			/** @type {Updater<string>} */
			let updateName;
			let count = 0;
			function Inner() {
				const [name, setName] = signal('foo');
				updateName = setName;

				count++;
				return <div>{name()}</div>;
			}

			/** @type {Updater<void>} */
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
			/** @type {Updater<string>} */
			let updateName;
			function Inner() {
				const [name, setName] = signal('foo');
				updateName = setName;

				const foo = computed(() => {
					if (name() === 'fail') {
						throw new Error('errored');
					}

					return name();
				});

				return <div>{foo()}</div>;
			}

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
	});

	describe('ref', () => {
		it('should set element', () => {
			let refValue;
			function App() {
				const myRef = ref(null);
				refValue = myRef;
				return <div ref={myRef} />;
			}

			render(<App />, scratch);
			expect(refValue).to.deep.equal({ current: scratch.firstChild });
		});
	});

	describe('signals', () => {
		it('should render signal value', () => {
			function App() {
				const [name] = signal('foo');
				return <div>{name()}</div>;
			}

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
		});

		describe('updater', () => {
			it('should update signal value', () => {
				/** @type {Updater<string>} */
				let update;
				function App() {
					const [name, setName] = signal('foo');
					update = setName;
					return <div>{name()}</div>;
				}

				render(<App />, scratch);
				update('bar');
				rerender();
				expect(scratch.innerHTML).to.equal('<div>bar</div>');
			});

			it('should NOT update when signal is not used', () => {
				/** @type {Updater<string>} */
				let update;

				function Inner(props) {
					return <div>{props.name.value}</div>;
				}

				let count = 0;
				function App() {
					const [name, setName] = signal('foo');
					update = setName;
					count++;
					return <Inner name={name} />;
				}

				render(<App />, scratch);
				expect(scratch.innerHTML).to.equal('<div>foo</div>');
				expect(count).to.equal(1);

				update('bar');
				rerender();
				expect(scratch.innerHTML).to.equal('<div>bar</div>');
				expect(count).to.equal(1);
			});

			it('should update signal via updater function', () => {
				/** @type {Updater<string>} */
				let update;
				function App() {
					const [name, setName] = signal('foo');
					update = setName;
					return <div>{name()}</div>;
				}

				render(<App />, scratch);
				update(prev => prev + 'bar');
				rerender();
				expect(scratch.innerHTML).to.equal('<div>foobar</div>');
			});

			it('should abort signal update in updater function', () => {
				/** @type {Updater<string>} */
				let update;
				function App() {
					const [name, setName] = signal('foo');
					update = setName;
					return <div>{name()}</div>;
				}

				render(<App />, scratch);
				update(() => null);
				rerender();
				expect(scratch.innerHTML).to.equal('<div>foo</div>');
			});
		});
	});

	describe('readonly', () => {
		it('should turn into atom', () => {
			let count = 0;
			function App({ foo }) {
				const $foo = readonly(foo);
				count++;
				return <div>{$foo()}</div>;
			}

			render(<App foo={0} />, scratch);
			expect(scratch.innerHTML).to.equal('<div>0</div>');
			expect(count).to.equal(1);
		});

		it('should react to new values', () => {
			let count = 0;
			let computedCount = 0;
			function App({ foo }) {
				const $foo = readonly(foo);
				const c = computed(() => {
					computedCount++;
					return $foo();
				});
				count++;
				return <div>{c()}</div>;
			}

			render(<App foo={0} />, scratch);
			expect(scratch.innerHTML).to.equal('<div>0</div>');
			expect(count).to.equal(1);
			expect(computedCount).to.equal(1);

			render(<App foo={1} />, scratch);
			expect(scratch.innerHTML).to.equal('<div>1</div>');
			expect(count).to.equal(2);
			expect(computedCount).to.equal(2);
		});
	});

	describe('computed', () => {
		it('should return atom', () => {
			function App() {
				const [name] = signal('foo');
				const bar = computed(() => name());
				return <div>{bar()}</div>;
			}

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
		});

		it('should rerun on update', () => {
			/** @type {(s: string) => void} */
			let update;
			function App() {
				const [name, updateName] = signal('foo');
				update = updateName;
				const bar = computed(() => name());
				return <div>{bar()}</div>;
			}

			render(<App />, scratch);
			update('bar');
			rerender();
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});

		it('should only update once', () => {
			/** @type {Updater<string>} */
			let update;
			let count = 0;
			function App() {
				const [name, updateName] = signal('foo');
				update = updateName;
				const a = computed(() => name() + 'A');
				const b = computed(() => name() + 'B');
				const c = computed(() => {
					count++;
					return a() + ' ' + b();
				});

				return <div>{c()}</div>;
			}

			render(<App />, scratch);
			expect(count).to.equal(1);

			update('bar');
			rerender();
			expect(count).to.equal(2);
		});

		it('should skip updates if signal value did not change', () => {
			/** @type {Updater<number>} */
			let update;
			let count = 0;
			function App() {
				const [i, setI] = signal(0);
				update = setI;
				const sum = computed(() => {
					count++;
					return i();
				});

				return <div>{sum()}</div>;
			}

			render(<App />, scratch);
			expect(count).to.equal(1);

			update(0);
			rerender();
			expect(count).to.equal(1);
		});

		it('should skip updates if computed result did not change', () => {
			/** @type {Updater<number>} */
			let update;
			let count = 0;
			function App() {
				const [i, setI] = signal(0, 'i');
				update = setI;
				const tmp = computed(() => (i() > 10 ? 'foo' : 'bar'), 'tmp');
				const sum = computed(() => {
					count++;
					return tmp();
				}, 'sum');

				return <div>{sum()}</div>;
			}

			render(<App />, scratch);
			expect(count).to.equal(1);

			update(1);
			rerender();
			expect(count).to.equal(1);
		});

		it('should throw when a signal is updated inside computed', () => {
			function App() {
				const [name] = signal('foo');
				const [, setNope] = signal('foo');
				const bar = computed(() => {
					setNope(name());
					return name();
				});
				return <div>{bar()}</div>;
			}

			expect(() => render(<App />, scratch)).to.throw(/Must not/);
		});
	});

	describe('effect', () => {
		it('should call effect', () => {
			let spy = sinon.spy();
			function App() {
				effect(spy);
				return null;
			}

			act(() => {
				render(<App />, scratch);
			});
			expect(spy).to.be.called;
		});

		it('should be called when dependency changes', () => {
			let spy = sinon.spy();
			let renderSpy = sinon.spy();
			function Inner(props) {
				effect(() => {
					spy(props.name.value);
				});

				renderSpy();
				return null;
			}

			let update;
			function App() {
				const [name, setName] = signal('foo');
				update = setName;
				return <Inner name={name} />;
			}

			act(() => {
				render(<App />, scratch);
			});
			expect(spy).to.be.calledOnce;
			expect(spy).to.be.calledWith('foo');
			expect(renderSpy).to.be.calledOnce;

			act(() => {
				update('bar');
			});
			expect(spy).to.be.calledTwice;
			expect(renderSpy).to.be.calledOnce;
		});

		it('should call unmount function', () => {
			const cleanup = sinon.spy();
			const callback = sinon.spy(() => cleanup);

			function App() {
				effect(callback);
				return null;
			}

			act(() => render(<App />, scratch));
			expect(cleanup).not.to.be.called;
			expect(callback).to.be.calledOnce;

			act(() => render(null, scratch));
			expect(cleanup).to.be.calledOnce;
		});

		it('cancels the effect when the component get unmounted before it had the chance to run it', () => {
			const cleanupFunction = sinon.spy();
			const callback = sinon.spy(() => cleanupFunction);

			function Comp() {
				effect(callback);
				return null;
			}

			render(<Comp />, scratch);
			render(null, scratch);

			return scheduleEffectAssert(() => {
				expect(cleanupFunction).to.not.be.called;
				expect(callback).to.not.be.called;
			});
		});

		it('should not be called on rerendering', () => {
			let executionOrder = [];
			const App = ({ i }) => {
				executionOrder = [];
				effect(() => {
					executionOrder.push('action1');
					return () => executionOrder.push('cleanup1');
				});
				effect(() => {
					executionOrder.push('action2');
					return () => executionOrder.push('cleanup2');
				});
				return <p>Test {i}</p>;
			};
			act(() => render(<App i={0} />, scratch));
			expect(executionOrder).to.deep.equal(['action1', 'action2']);

			act(() => render(<App i={2} />, scratch));
			expect(executionOrder).to.deep.equal([]);
		});

		it('should execute multiple effects in same component in the right order', () => {
			let update;
			let executionOrder = [];
			const App = () => {
				const [$i, setI] = signal(0);
				update = setI;

				effect(() => {
					$i();
					executionOrder.push('action1');
					return () => {
						executionOrder.push('cleanup1');
					};
				});
				effect(() => {
					$i();
					executionOrder.push('action2');
					return () => {
						executionOrder.push('cleanup2');
					};
				});
				return <p>Test</p>;
			};
			act(() => render(<App />, scratch));
			expect(executionOrder).to.deep.equal(['action1', 'action2']);

			executionOrder = [];
			act(() => update(2));
			expect(executionOrder).to.deep.equal([
				'cleanup1',
				'cleanup2',
				'action1',
				'action2'
			]);
		});

		it('should catch errors in callback during mount', () => {
			const App = () => {
				effect(() => {
					throw new Error('fail');
				});
				return <p>Test</p>;
			};

			act(() =>
				render(
					<ErrorBoundary>
						<App />
					</ErrorBoundary>,
					scratch
				)
			);

			expect(scratch.textContent).to.equal('fail');
		});

		it('should catch errors in callback by reaction', () => {
			let update;
			const App = () => {
				const [foo, setFoo] = signal(0);
				update = setFoo;

				effect(() => {
					if (foo() > 0) {
						throw new Error('fail');
					}
				});
				return <p>Test</p>;
			};

			act(() =>
				render(
					<ErrorBoundary>
						<App />
					</ErrorBoundary>,
					scratch
				)
			);

			expect(scratch.textContent).to.equal('Test');

			act(() => update(2));
			expect(scratch.textContent).to.equal('fail');
		});

		it.skip('should catch errors in cleanup', () => {
			let update;
			const App = () => {
				const [foo, setFoo] = signal(0, 'foo');
				update = setFoo;

				effect(() => {
					// Trigger read
					foo();
					return () => {
						throw new Error('fail');
					};
				}, 'effect');
				return <p>Test</p>;
			};

			act(() =>
				render(
					<ErrorBoundary>
						<App />
					</ErrorBoundary>,
					scratch
				)
			);
			expect(scratch.textContent).to.equal('Test');

			act(() => update(2));

			expect(scratch.textContent).to.equal('fail');
		});

		it('should not be called if options._skipEffect is set', () => {
			const tmp = options._skipEffects;
			options._skipEffects = true;
			let spy = sinon.spy();

			function App() {
				effect(spy);
				return null;
			}

			try {
				act(() => {
					render(<App />, scratch);
				});
				expect(spy).not.to.be.called;
			} finally {
				options._skipEffects = tmp;
			}
		});
	});

	describe('inject', () => {
		it('should read default value from context', () => {
			const Ctx = createContext('foo');

			function App() {
				const name = inject(Ctx);
				return <div>{name.value}</div>;
			}

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');
		});

		it('should read from context', () => {
			const Ctx = createContext('foo');

			function Inner() {
				const name = inject(Ctx);
				return <div>{name.value}</div>;
			}

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

			function Inner() {
				const name = inject(Ctx);
				return <div>{name.value}</div>;
			}

			class Blocker extends Component {
				shouldComponentUpdate() {
					return false;
				}

				render() {
					return <Inner />;
				}
			}

			/** @type {Updater<string>} */
			let update;
			function App() {
				const [ctx, setCtx] = signal('foo');
				update = setCtx;
				return (
					<Ctx.Provider value={ctx()}>
						<Blocker />
					</Ctx.Provider>
				);
			}

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>foo</div>');

			update('bar');
			rerender();
			expect(scratch.innerHTML).to.equal('<div>bar</div>');
		});

		it('should only update if context value is used', () => {
			const Ctx = createContext('foo');

			let count = 0;
			function Inner() {
				inject(Ctx); // unused
				return <div>{count++}</div>;
			}

			class Blocker extends Component {
				shouldComponentUpdate() {
					return false;
				}

				render() {
					return <Inner />;
				}
			}

			/** @type {Updater<string>} */
			let update;
			function App() {
				const [ctx, setCtx] = signal('foo');
				update = setCtx;
				return (
					<Ctx.Provider value={ctx()}>
						<Blocker />
					</Ctx.Provider>
				);
			}

			render(<App />, scratch);
			expect(scratch.innerHTML).to.equal('<div>0</div>');

			update('bar');
			rerender();
			expect(scratch.innerHTML).to.equal('<div>0</div>');
		});
	});
});
