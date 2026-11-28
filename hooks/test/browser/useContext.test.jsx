import {
	createElement,
	render,
	createContext,
	Component,
	Fragment
} from 'preact';
import { act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useContext, useEffect, useState } from 'preact/hooks';
import { vi } from 'vitest';
import { memo, use } from 'preact/compat';

describe('useContext', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('gets values from context', () => {
		const values = [];
		const Context = createContext(13);

		function Comp() {
			const value = useContext(Context);
			values.push(value);
			return null;
		}

		render(<Comp />, scratch);
		render(
			<Context.Provider value={42}>
				<Comp />
			</Context.Provider>,
			scratch
		);
		render(
			<Context.Provider value={69}>
				<Comp />
			</Context.Provider>,
			scratch
		);

		expect(values).to.deep.equal([13, 42, 69]);
	});

	it('should use default value', () => {
		const Foo = createContext(42);
		const spy = vi.fn();

		function App() {
			spy(useContext(Foo));
			return <div />;
		}

		render(<App />, scratch);
		expect(spy).toHaveBeenCalledWith(42);
	});

	it('should update when value changes with nonUpdating Component on top', async () => {
		const spy = vi.fn();
		const Ctx = createContext(0);

		class NoUpdate extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render() {
				return this.props.children;
			}
		}

		function App(props) {
			return (
				<Ctx.Provider value={props.value}>
					<NoUpdate>
						<Comp />
					</NoUpdate>
				</Ctx.Provider>
			);
		}

		function Comp() {
			const value = useContext(Ctx);
			spy(value);
			return <h1>{value}</h1>;
		}

		render(<App value={0} />, scratch);
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(0);
		render(<App value={1} />, scratch);

		return new Promise(resolve => {
			// Wait for enqueued hook update
			setTimeout(() => {
				// Should not be called a third time
				expect(spy).toHaveBeenCalledTimes(2);
				expect(spy).toHaveBeenCalledWith(1);
				resolve();
			}, 0);
		});
	});

	it('should only update when value has changed', async () => {
		const spy = vi.fn();
		const Ctx = createContext(0);

		function App(props) {
			return (
				<Ctx.Provider value={props.value}>
					<Comp />
				</Ctx.Provider>
			);
		}

		function Comp() {
			const value = useContext(Ctx);
			spy(value);
			return <h1>{value}</h1>;
		}

		render(<App value={0} />, scratch);
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(0);
		render(<App value={1} />, scratch);

		expect(spy).toHaveBeenCalledTimes(2);
		expect(spy).toHaveBeenCalledWith(1);

		return new Promise(resolve => {
			// Wait for enqueued hook update
			setTimeout(() => {
				// Should not be called a third time
				expect(spy).toHaveBeenCalledTimes(2);
				resolve();
			}, 0);
		});
	});

	it('should allow multiple context hooks at the same time', () => {
		const Foo = createContext(0);
		const Bar = createContext(10);
		const spy = vi.fn();
		const unmountspy = vi.fn();

		function Comp() {
			const foo = useContext(Foo);
			const bar = useContext(Bar);
			spy(foo, bar);
			useEffect(() => () => unmountspy());

			return <div />;
		}

		render(
			<Foo.Provider value={0}>
				<Bar.Provider value={10}>
					<Comp />
				</Bar.Provider>
			</Foo.Provider>,
			scratch
		);

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(0, 10);

		render(
			<Foo.Provider value={11}>
				<Bar.Provider value={42}>
					<Comp />
				</Bar.Provider>
			</Foo.Provider>,
			scratch
		);

		expect(spy).toHaveBeenCalledTimes(2);
		expect(unmountspy).not.toHaveBeenCalled();
	});

	it('should only subscribe a component once', () => {
		const values = [];
		const Context = createContext(13);
		let provider, subSpy;

		function Comp() {
			provider = this._vnode._parent._component;
			const value = useContext(Context);
			values.push(value);
			return null;
		}

		render(<Comp />, scratch);

		render(
			<Context.Provider value={42}>
				<Comp />
			</Context.Provider>,
			scratch
		);
		subSpy = vi.spyOn(provider, 'sub');

		render(
			<Context.Provider value={69}>
				<Comp />
			</Context.Provider>,
			scratch
		);
		expect(subSpy).not.toHaveBeenCalled();

		expect(values).to.deep.equal([13, 42, 69]);
	});

	it('should only subscribe a component once (non-provider)', () => {
		const values = [];
		const Context = createContext(13);
		let provider, subSpy;

		function Comp() {
			provider = this._vnode._parent._component;
			const value = useContext(Context);
			values.push(value);
			return null;
		}

		render(<Comp />, scratch);

		render(
			<Context value={42}>
				<Comp />
			</Context>,
			scratch
		);
		subSpy = vi.spyOn(provider, 'sub');

		render(
			<Context value={69}>
				<Comp />
			</Context>,
			scratch
		);
		expect(subSpy).not.toHaveBeenCalled();

		expect(values).to.deep.equal([13, 42, 69]);
	});

	it('should maintain context', async () => {
		const context = createContext(null);
		const { Provider } = context;
		const first = { name: 'first' };
		const second = { name: 'second' };

		const Input = () => {
			const config = useContext(context);

			// Avoid eslint complaining about unused first value
			const state = useState('initial');
			const set = state[1];

			useEffect(() => {
				// Schedule the update on the next frame
				requestAnimationFrame(() => {
					set('irrelevant');
				});
			}, [config]);

			return <div>{config.name}</div>;
		};

		const App = props => {
			const [config, setConfig] = useState({});

			useEffect(() => {
				setConfig(props.config);
			}, [props.config]);

			return (
				<Provider value={config}>
					<Input />
				</Provider>
			);
		};

		act(() => {
			render(<App config={first} />, scratch);

			// Create a new div to append the `second` case
			const div = scratch.appendChild(document.createElement('div'));
			render(<App config={second} />, div);
		});

		return new Promise(resolve => {
			// Push the expect into the next frame
			requestAnimationFrame(() => {
				expect(scratch.innerHTML).equal(
					'<div>first</div><div><div>second</div></div>'
				);
				resolve();
			});
		});
	});

	it('should not rerender consumers that have been unmounted', () => {
		const context = createContext(0);
		const Provider = context.Provider;

		const Inner = vi.fn(() => {
			const value = useContext(context);
			return <div>{value}</div>;
		});

		let toggleConsumer;
		let changeValue;
		class App extends Component {
			constructor() {
				super();

				this.state = { value: 0, show: true };
				changeValue = value => this.setState({ value });
				toggleConsumer = () => this.setState(({ show }) => ({ show: !show }));
			}
			render(props, state) {
				return (
					<Provider value={state.value}>
						<div>{state.show ? <Inner /> : null}</div>
					</Provider>
				);
			}
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div><div>0</div></div>');
		expect(Inner).toHaveBeenCalledOnce();

		act(() => changeValue(1));
		expect(scratch.innerHTML).to.equal('<div><div>1</div></div>');
		expect(Inner).toHaveBeenCalledTimes(2);

		act(() => toggleConsumer());
		expect(scratch.innerHTML).to.equal('<div></div>');
		expect(Inner).toHaveBeenCalledTimes(2);

		act(() => changeValue(2));
		expect(scratch.innerHTML).to.equal('<div></div>');
		expect(Inner).toHaveBeenCalledTimes(2);
	});

	it('should rerender when reset to defaultValue', () => {
		const defaultValue = { state: 'hi' };
		const context = createContext(defaultValue);
		let set;

		const Consumer = () => {
			const ctx = useContext(context);
			return <p>{ctx.state}</p>;
		};

		class NoUpdate extends Component {
			shouldComponentUpdate() {
				return false;
			}

			render() {
				return <Consumer />;
			}
		}

		const Provider = () => {
			const [state, setState] = useState(defaultValue);
			set = setState;
			return (
				<context.Provider value={state}>
					<NoUpdate />
				</context.Provider>
			);
		};

		render(<Provider />, scratch);
		expect(scratch.innerHTML).to.equal('<p>hi</p>');

		act(() => {
			set({ state: 'bye' });
		});
		expect(scratch.innerHTML).to.equal('<p>bye</p>');

		act(() => {
			set(defaultValue);
		});
		expect(scratch.innerHTML).to.equal('<p>hi</p>');
	});
	describe('changing the context argument', () => {
		function setup(Consumer, contexts) {
			const update = [];
			let select, show, instance;
			const Child = memo(function () {
				instance = this;
				const [selected, setSelected] = useState(0);
				select = setSelected;
				return <output>{Consumer(selected)}</output>;
			});
			const child = <Child />;
			function Provider({ index, children }) {
				const [value, setValue] = useState(index + 1);
				update[index] = setValue;
				const Context = contexts[index];
				return <Context value={value}>{children}</Context>;
			}
			function App() {
				const [visible, setVisible] = useState(true);
				show = setVisible;
				return contexts.reduceRight(
					(children, _, index) => <Provider index={index}>{children}</Provider>,
					visible && child
				);
			}
			render(<App />, scratch);
			return {
				update: (index, value) => act(() => update[index](value)),
				select: value => act(() => select(value)),
				unmount: () => act(() => show(false)),
				instance: () => instance
			};
		}

		it('updates the new context and releases the old context through repeated switches', () => {
			const A = createContext(0),
				B = createContext(0);
			const reads = vi.fn();
			const app = setup(
				selected => {
					const value = useContext(selected ? B : A);
					reads(value);
					return value;
				},
				[A, B]
			);
			const cleanup = app.instance().componentWillUnmount;
			app.update(0, 3);
			expect(scratch.textContent).to.equal('3');
			for (let i = 0; i < 20; i++) {
				const selected = (i + 1) % 2;
				app.select(selected);
				app.update(selected, i + 10);
				expect(scratch.textContent).to.equal(String(i + 10));
				const count = reads.mock.calls.length;
				app.update(1 - selected, i + 100);
				expect(reads).toHaveBeenCalledTimes(count);
				expect(app.instance().componentWillUnmount).to.equal(cleanup);
			}
			app.unmount();
			const count = reads.mock.calls.length;
			app.update(0, 1000);
			app.update(1, 2000);
			expect(reads).toHaveBeenCalledTimes(count);
		});

		it.each([false, true])(
			'preserves another hook sharing a provider (reverse: %s)',
			reverse => {
				const A = createContext(0),
					B = createContext(0);
				const app = setup(
					selected => {
						const first = useContext(reverse ? A : selected ? B : A);
						const second = useContext(reverse ? (selected ? B : A) : A);
						return first + ':' + second;
					},
					[A, B]
				);
				app.select(1);
				app.update(0, 3);
				expect(scratch.textContent).to.equal(reverse ? '3:2' : '2:3');
				app.update(1, 4);
				expect(scratch.textContent).to.equal(reverse ? '3:4' : '4:3');
				app.select(0);
				app.update(0, 5);
				expect(scratch.textContent).to.equal('5:5');
			}
		);

		it('releases a provider when both hook slots switch away', () => {
			const A = createContext(0),
				B = createContext(0);
			const reads = vi.fn();
			const app = setup(
				selected => {
					const first = useContext(selected ? B : A);
					const second = useContext(selected ? B : A);
					reads();
					return first + ':' + second;
				},
				[A, B]
			);
			app.select(1);
			const count = reads.mock.calls.length;
			app.update(0, 9);
			expect(reads).toHaveBeenCalledTimes(count);
			app.update(1, 4);
			expect(scratch.textContent).to.equal('4:4');
		});

		it('moves between provided contexts and defaults, including undefined provider values', () => {
			const A = createContext('a'),
				B = createContext('b');
			const C = createContext('c');
			const reads = vi.fn();
			const app = setup(
				selected => {
					const value = useContext([B, A, C][selected]);
					reads();
					return String(value);
				},
				[A]
			);
			expect(scratch.textContent).to.equal('b');
			app.select(1);
			app.update(0, undefined);
			expect(scratch.textContent).to.equal('undefined');
			app.select(2);
			const count = reads.mock.calls.length;
			app.update(0, 4);
			expect(reads).toHaveBeenCalledTimes(count);
			expect(scratch.textContent).to.equal('c');
			app.select(1);
			app.update(0, 5);
			expect(scratch.textContent).to.equal('5');
		});

		it('reconciles provider identity and removal in the component context map', () => {
			const Context = createContext('default');
			const providers = [];
			let updateA, updateB, consumer;
			const reads = vi.fn();
			function Consumer() {
				consumer = this;
				const value = useContext(Context);
				reads();
				return <output>{value}</output>;
			}
			class Bridge extends Component {
				getChildContext() {
					return { [Context._id]: providers[0] };
				}
				render() {
					return <Consumer />;
				}
			}
			function select(index) {
				consumer.context[Context._id] = providers[index];
				act(() => consumer.forceUpdate());
			}
			function Capture({ index }) {
				providers[index] = this.context[Context._id];
				return null;
			}
			const bridgeNode = <Bridge />;
			function App() {
				const [a, setA] = useState('a');
				const [b, setB] = useState('b');
				updateA = setA;
				updateB = setB;
				return (
					<>
						<Context value={a}>
							<Capture index={0} />
						</Context>
						<Context value={b}>
							<Capture index={1} />
						</Context>
						{bridgeNode}
					</>
				);
			}
			render(<App />, scratch);
			const original = consumer;
			select(1);
			act(() => updateB('b2'));
			expect(scratch.textContent).to.equal('b2');
			expect(consumer).to.equal(original);
			select(2);
			expect(scratch.textContent).to.equal('default');
			const count = reads.mock.calls.length;
			act(() => updateA('a2'));
			act(() => updateB('b3'));
			expect(reads).toHaveBeenCalledTimes(count);
			expect(scratch.textContent).to.equal('default');
			select(0);
			act(() => updateA('a3'));
			expect(scratch.textContent).to.equal('a3');
		});

		it('preserves the implicit use subscription', () => {
			const A = createContext(0),
				B = createContext(0);
			let select, updateA, updateB;
			function Consumer() {
				const [selected, setSelected] = useState(false);
				select = setSelected;
				const value = useContext(selected ? B : A);
				const implicit = use(A);
				return (
					<output>
						{implicit}:{value}
					</output>
				);
			}
			const child = <Consumer />;
			function Inner() {
				const [value, setValue] = useState(2);
				updateB = setValue;
				return <B value={value}>{child}</B>;
			}
			const inner = <Inner />;
			function App() {
				const [value, setValue] = useState(1);
				updateA = setValue;
				return <A value={value}>{inner}</A>;
			}
			render(<App />, scratch);
			act(() => select(true));
			act(() => updateA(3));
			expect(scratch.textContent).to.equal('3:2');
			act(() => updateB(4));
			expect(scratch.textContent).to.equal('3:4');
		});
	});
});
