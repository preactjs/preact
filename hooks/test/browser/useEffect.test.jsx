import { Component, Fragment, createElement, options, render } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { act, setupRerender, teardown as teardownAct } from 'preact/test-utils';
import { vi } from 'vitest';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { scheduleEffectAssert } from '../_util/useEffectUtil';
import { useEffectAssertions } from './useEffectAssertions';

describe('useEffect', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	useEffectAssertions(useEffect, scheduleEffectAssert);

	it('calls the effect immediately if another render is about to start', () => {
		const cleanupFunction = vi.fn();
		const callback = vi.fn(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(cleanupFunction).not.toHaveBeenCalled();
		expect(callback).toHaveBeenCalledOnce();

		render(<Comp />, scratch);

		expect(cleanupFunction).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledTimes(2);
	});

	it('cancels the effect when the component get unmounted before it had the chance to run it', () => {
		const cleanupFunction = vi.fn();
		const callback = vi.fn(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(null, scratch);

		return scheduleEffectAssert(() => {
			expect(cleanupFunction).not.toHaveBeenCalled();
			expect(callback).not.toHaveBeenCalled();
		});
	});

	it('should execute multiple effects in same component in the right order', () => {
		let executionOrder = [];
		const App = ({ i }) => {
			executionOrder = [];
			useEffect(() => {
				executionOrder.push('action1');
				return () => executionOrder.push('cleanup1');
			}, [i]);
			useEffect(() => {
				executionOrder.push('action2');
				return () => executionOrder.push('cleanup2');
			}, [i]);
			return <p>Test</p>;
		};
		act(() => render(<App i={0} />, scratch));
		act(() => render(<App i={2} />, scratch));
		expect(executionOrder).to.deep.equal([
			'cleanup1',
			'cleanup2',
			'action1',
			'action2'
		]);
	});

	it('should execute effects in parent if child throws in effect', async () => {
		const executionOrder = [];

		const Child = () => {
			useEffect(() => {
				executionOrder.push('child');
				throw new Error('test');
			}, []);

			useEffect(() => {
				executionOrder.push('child after throw');
				return () => executionOrder.push('child after throw cleanup');
			}, []);

			return <p>Test</p>;
		};

		const Parent = () => {
			useEffect(() => {
				executionOrder.push('parent');
				return () => executionOrder.push('parent cleanup');
			}, []);
			return <Child />;
		};

		class ErrorBoundary extends Component {
			componentDidCatch(error) {
				this.setState({ error });
			}

			render({ children }, { error }) {
				return error ? <div>error</div> : children;
			}
		}

		act(() =>
			render(
				<ErrorBoundary>
					<Parent />
				</ErrorBoundary>,
				scratch
			)
		);

		expect(executionOrder).to.deep.equal(['child', 'parent', 'parent cleanup']);
		expect(scratch.innerHTML).to.equal('<div>error</div>');
	});

	it('should throw an error upwards', () => {
		const spy = vi.fn();
		let errored = false;

		const Page1 = () => {
			const [state, setState] = useState('loading');
			useEffect(() => {
				setState('loaded');
			}, []);
			return <p>{state}</p>;
		};

		const Page2 = () => {
			useEffect(() => {
				throw new Error('err');
			}, []);
			return <p>invisible</p>;
		};

		class App extends Component {
			componentDidCatch(err) {
				spy();
				errored = err;
				this.forceUpdate();
			}

			render(props, state) {
				if (errored) {
					return <p>Error</p>;
				}

				return <Fragment>{props.page === 1 ? <Page1 /> : <Page2 />}</Fragment>;
			}
		}

		act(() => render(<App page={1} />, scratch));
		expect(spy).not.toHaveBeenCalled();
		expect(scratch.innerHTML).to.equal('<p>loaded</p>');

		act(() => render(<App page={2} />, scratch));
		expect(spy).toHaveBeenCalledOnce();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		errored = false;

		act(() => render(<App page={1} />, scratch));
		expect(spy).toHaveBeenCalledOnce();
		expect(scratch.innerHTML).to.equal('<p>loaded</p>');
	});

	it('should throw an error upwards from return', () => {
		const spy = vi.fn();
		let errored = false;

		const Page1 = () => {
			const [state, setState] = useState('loading');
			useEffect(() => {
				setState('loaded');
			}, []);
			return <p>{state}</p>;
		};

		const Page2 = () => {
			useEffect(() => {
				return () => {
					throw new Error('err');
				};
			}, []);
			return <p>Load</p>;
		};

		class App extends Component {
			componentDidCatch(err) {
				spy();
				errored = err;
				this.forceUpdate();
			}

			render(props, state) {
				if (errored) {
					return <p>Error</p>;
				}

				return <Fragment>{props.page === 1 ? <Page1 /> : <Page2 />}</Fragment>;
			}
		}

		act(() => render(<App page={2} />, scratch));
		expect(scratch.innerHTML).to.equal('<p>Load</p>');

		act(() => render(<App page={1} />, scratch));
		expect(spy).toHaveBeenCalledOnce();
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('should route deferred cleanup errors after a state update', () => {
		const spy = vi.fn();
		let hide;

		function ThrowOnUnmount() {
			useEffect(
				() => () => {
					throw new Error('err');
				},
				[]
			);
			return <span>Child</span>;
		}

		function StatefulParent() {
			const [show, setShow] = useState(true);
			hide = () => setShow(false);
			return <div>{show ? <ThrowOnUnmount /> : <span>Gone</span>}</div>;
		}

		class ErrorBoundary extends Component {
			componentDidCatch(error) {
				spy(error);
				this.setState({ error: true });
			}

			render(props, state) {
				return state.error ? <p>Error</p> : props.children;
			}
		}

		act(() =>
			render(
				<ErrorBoundary>
					<StatefulParent />
				</ErrorBoundary>,
				scratch
			)
		);
		act(() => hide());

		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0][0]).to.have.property('message', 'err');
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('catches errors when error is invoked during render', () => {
		const spy = vi.fn();
		let errored;

		function Comp() {
			useEffect(() => {
				throw new Error('hi');
			});
			return null;
		}

		class App extends Component {
			componentDidCatch(err) {
				spy();
				errored = err;
				this.forceUpdate();
			}

			render(props, state) {
				if (errored) {
					return <p>Error</p>;
				}

				return <Comp />;
			}
		}

		render(<App />, scratch);
		act(() => {
			render(<App />, scratch);
		});
		expect(spy).toHaveBeenCalledOnce();
		expect(errored).to.be.an('Error').with.property('message', 'hi');
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('should flush cleanups of a root unmounted from within an effect', async () => {
		const log = [];
		const host = document.createElement('div');
		const other = document.createElement('div');
		scratch.appendChild(host);
		scratch.appendChild(other);

		function Other() {
			useEffect(() => () => log.push('other cleanup'), []);
			return <p>other</p>;
		}

		function Trigger() {
			useEffect(() => {
				log.push('trigger effect');
				render(null, other);
			}, []);
			return <p>trigger</p>;
		}

		render(<Other />, other);
		await new Promise(r => setTimeout(r, 60));

		render(<Trigger />, host);
		await new Promise(r => setTimeout(r, 60));

		expect(log).to.deep.equal(['trigger effect', 'other cleanup']);
	});

	it('should allow creating a new root', () => {
		const root = document.createElement('div');
		const global = document.createElement('div');
		scratch.appendChild(root);
		scratch.appendChild(global);

		const Modal = props => {
			const [, setCanProceed] = useState(true);
			const ChildProp = props.content;

			return (
				<div>
					<ChildProp setCanProceed={setCanProceed} />
				</div>
			);
		};

		const Inner = () => {
			useEffect(() => {
				render(<div>global</div>, global);
			}, []);

			return <div>Inner</div>;
		};

		act(() => {
			render(
				<Modal
					content={props => {
						props.setCanProceed(false);
						return <Inner />;
					}}
				/>,
				root
			);
		});

		expect(scratch.innerHTML).to.equal(
			'<div><div><div>Inner</div></div></div><div><div>global</div></div>'
		);
	});

	it('should not crash when effect returns truthy non-function value', () => {
		const callback = vi.fn(() => 'truthy');
		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(callback).toHaveBeenCalledOnce();

		render(<div>Replacement</div>, scratch);
	});

	it('support render roots from an effect', async () => {
		let promise, increment;

		const Counter = () => {
			const [count, setCount] = useState(0);
			const renderRoot = useRef();
			useEffect(() => {
				if (count > 0) {
					const div = renderRoot.current;
					return () => render(<Dummy />, div);
				}
				return () => 'test';
			}, [count]);

			increment = () => {
				setCount(x => x + 1);
				promise = new Promise(res => {
					setTimeout(() => {
						setCount(x => x + 1);
						res();
					});
				});
			};

			return (
				<div>
					<div>Count: {count}</div>
					<div ref={renderRoot} />
				</div>
			);
		};

		const Dummy = () => <div>dummy</div>;

		render(<Counter />, scratch);

		expect(scratch.innerHTML).to.equal(
			'<div><div>Count: 0</div><div></div></div>'
		);

		act(() => {
			increment();
		});
		await promise;
		act(() => {});
		expect(scratch.innerHTML).to.equal(
			'<div><div>Count: 2</div><div><div>dummy</div></div></div>'
		);
	});

	it('hooks should be called in right order', async () => {
		teardownAct();

		let increment;

		const Counter = () => {
			const [count, setCount] = useState(0);
			useState('binggo!!');
			const renderRoot = useRef();
			useEffect(() => {
				const div = renderRoot.current;
				render(<Dummy />, div);
			}, [count]);

			increment = () => {
				setCount(x => x + 1);
				return Promise.resolve().then(() => setCount(x => x + 1));
			};

			return (
				<div>
					<div>Count: {count}</div>
					<div ref={renderRoot} />
				</div>
			);
		};

		const Dummy = () => {
			useState();
			return <div>dummy</div>;
		};

		render(<Counter />, scratch);

		expect(scratch.innerHTML).to.equal(
			'<div><div>Count: 0</div><div></div></div>'
		);
		/** Using the act function will affect the timing of the useEffect */
		await increment();

		expect(scratch.innerHTML).to.equal(
			'<div><div>Count: 2</div><div><div>dummy</div></div></div>'
		);
	});

	it('handles errors correctly', () => {
		class ErrorBoundary extends Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
			}

			componentDidCatch(error) {
				this.setState({ error: 'oh no' });
			}

			render() {
				return this.state.error ? (
					<h2>Error! {this.state.error}</h2>
				) : (
					this.props.children
				);
			}
		}

		let update;
		const firstEffectSpy = vi.fn();
		const firstEffectcleanup = vi.fn();
		const secondEffectSpy = vi.fn();
		const secondEffectcleanup = vi.fn();

		const MainContent = () => {
			const [val, setVal] = useState(false);

			update = () => setVal(!val);
			useEffect(() => {
				firstEffectSpy();
				return () => {
					firstEffectcleanup();
					throw new Error('oops');
				};
			}, [val]);

			useEffect(() => {
				secondEffectSpy();
				return () => {
					secondEffectcleanup();
				};
			}, []);

			return <h1>Hello world</h1>;
		};

		act(() => {
			render(
				<ErrorBoundary>
					<MainContent />
				</ErrorBoundary>,
				scratch
			);
		});

		expect(firstEffectSpy).toHaveBeenCalledOnce();
		expect(secondEffectSpy).toHaveBeenCalledOnce();

		act(() => {
			update();
		});

		expect(firstEffectSpy).toHaveBeenCalledOnce();
		expect(secondEffectSpy).toHaveBeenCalledOnce();
		expect(firstEffectcleanup).toHaveBeenCalledOnce();
		expect(secondEffectcleanup).toHaveBeenCalledOnce();
	});

	it('orders effects effectively', () => {
		const calls = [];
		const GrandChild = ({ id }) => {
			useEffect(() => {
				calls.push(`${id} - Effect`);
				return () => {
					calls.push(`${id} - Cleanup`);
				};
			}, [id]);
			return <p>{id}</p>;
		};

		const Child = ({ id }) => {
			useEffect(() => {
				calls.push(`${id} - Effect`);
				return () => {
					calls.push(`${id} - Cleanup`);
				};
			}, [id]);
			return (
				<Fragment>
					<GrandChild id={`${id}-GrandChild-1`} />
					<GrandChild id={`${id}-GrandChild-2`} />
				</Fragment>
			);
		};

		function Parent() {
			useEffect(() => {
				calls.push('Parent - Effect');
				return () => {
					calls.push('Parent - Cleanup');
				};
			}, []);
			return (
				<div className="App">
					<Child id="Child-1" />
					<div>
						<Child id="Child-2" />
					</div>
					<Child id="Child-3" />
				</div>
			);
		}

		act(() => {
			render(<Parent />, scratch);
		});

		expect(calls).to.deep.equal([
			'Child-1-GrandChild-1 - Effect',
			'Child-1-GrandChild-2 - Effect',
			'Child-1 - Effect',
			'Child-2-GrandChild-1 - Effect',
			'Child-2-GrandChild-2 - Effect',
			'Child-2 - Effect',
			'Child-3-GrandChild-1 - Effect',
			'Child-3-GrandChild-2 - Effect',
			'Child-3 - Effect',
			'Parent - Effect'
		]);
	});

	it('should cancel effects from a disposed render', () => {
		const calls = [];
		const App = () => {
			const [greeting, setGreeting] = useState('bye');

			useEffect(() => {
				calls.push('doing effect' + greeting);
				return () => {
					calls.push('cleaning up' + greeting);
				};
			}, [greeting]);

			if (greeting === 'bye') {
				setGreeting('hi');
			}

			return <p>{greeting}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(calls.length).to.equal(1);
		expect(calls).to.deep.equal(['doing effecthi']);
	});

	it('should not rerun committed effects', () => {
		const calls = [];
		const App = ({ i }) => {
			const [greeting, setGreeting] = useState('hi');

			useEffect(() => {
				calls.push('doing effect' + greeting);
				return () => {
					calls.push('cleaning up' + greeting);
				};
			}, []);

			if (i === 2) {
				setGreeting('bye');
			}

			return <p>{greeting}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(calls.length).to.equal(1);
		expect(calls).to.deep.equal(['doing effecthi']);

		act(() => {
			render(<App i={2} />, scratch);
		});
	});

	it('should not schedule effects that have no change', () => {
		const calls = [];
		let set;
		const App = ({ i }) => {
			const [greeting, setGreeting] = useState('hi');
			set = setGreeting;

			useEffect(() => {
				calls.push('doing effect' + greeting);
				return () => {
					calls.push('cleaning up' + greeting);
				};
			}, [greeting]);

			if (greeting === 'bye') {
				setGreeting('hi');
			}

			return <p>{greeting}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(calls.length).to.equal(1);
		expect(calls).to.deep.equal(['doing effecthi']);

		act(() => {
			set('bye');
		});
		expect(calls.length).to.equal(1);
		expect(calls).to.deep.equal(['doing effecthi']);
	});

	it('should not crash when effect throws and component is unmounted by render(null) during flush', () => {
		// In flushAfterPaintEffects():
		//   1. Guard checks component.__hooks — truthy, passes
		//   2. invokeEffect runs the effect callback
		//   3. The callback calls render(null, scratch) which unmounts the tree
		//      → options.unmount sets component.__hooks = undefined
		//   4. Resetting the hooks array to an empty array would throw an error
		let setVal;

		function App() {
			const [val, _setVal] = useState(0);
			setVal = _setVal;
			useEffect(() => {
				if (val === 1) {
					render(null, scratch);
				}
			}, [val]);
			return <div>val: {val}</div>;
		}

		act(() => {
			render(<App />, scratch);
		});

		act(() => {
			setVal(1);
		});
	});

	it('should run cleanup of an unmounted child after the parent commits (#4299)', () => {
		const log = [];

		function Child() {
			useEffect(() => {
				log.push('child effect');
				return () => {
					log.push('child cleanup');
				};
			}, []);
			return null;
		}

		function Parent({ show }) {
			log.push('parent render');
			useLayoutEffect(() => {
				log.push('parent layout effect');
			});
			return show ? <Child /> : null;
		}

		act(() => render(<Parent show={true} />, scratch));
		act(() => render(<Parent show={false} />, scratch));

		expect(log).to.deep.equal([
			'parent render',
			'parent layout effect',
			'child effect',
			'parent render',
			'parent layout effect',
			'child cleanup'
		]);
	});

	it('should run cleanups of a deep removed subtree in tree order (#4299)', () => {
		const log = [];

		const Level = ({ name, children }) => {
			useLayoutEffect(() => () => log.push(`${name} layout cleanup`), []);
			useEffect(() => () => log.push(`${name} passive cleanup`), []);
			return <div class={name}>{children}</div>;
		};

		const App = ({ show }) => (
			<section>
				{show ? (
					<Level name="A">
						<Level name="B">
							<Level name="C">
								<span>leaf</span>
							</Level>
						</Level>
					</Level>
				) : null}
			</section>
		);

		act(() => render(<App show />, scratch));
		log.length = 0;
		act(() => render(<App show={false} />, scratch));

		// All layout cleanups run in the commit, then all passive ones after
		// paint, each top-down. Matches React 19.
		expect(log).to.deep.equal([
			'A layout cleanup',
			'B layout cleanup',
			'C layout cleanup',
			'A passive cleanup',
			'B passive cleanup',
			'C passive cleanup'
		]);
	});

	it('should route a deferred cleanup error past boundaries inside the removed subtree', () => {
		const log = [];

		class Boundary extends Component {
			componentDidCatch(err) {
				log.push(`${this.props.name} caught: ${err.message}`);
				this.setState({ errored: true });
			}

			render(props, state) {
				return state.errored ? <p>{props.name} error</p> : props.children;
			}
		}

		const Deep = () => {
			useEffect(
				() => () => {
					throw new Error('deep');
				},
				[]
			);
			return <i>deep</i>;
		};

		// `Inner` is itself being removed, so it must not handle the error; the
		// still-mounted `Outer` boundary has to.
		const Removed = () => (
			<Boundary name="Inner">
				<div>
					<Deep />
				</div>
			</Boundary>
		);

		const App = ({ show }) => (
			<Boundary name="Outer">
				<div>{show ? <Removed /> : null}</div>
			</Boundary>
		);

		act(() => render(<App show />, scratch));
		log.length = 0;
		act(() => render(<App show={false} />, scratch));

		expect(log).to.deep.equal(['Outer caught: deep']);
		expect(scratch.innerHTML).to.equal('<p>Outer error</p>');
	});

	it('should run cleanups of unmounted components before new effects (#4299)', () => {
		const log = [];

		function Child({ name }) {
			useEffect(() => {
				log.push(`${name} effect`);
				return () => {
					log.push(`${name} cleanup`);
				};
			}, []);
			return <p>{name}</p>;
		}

		act(() => render(<Child key="a" name="A" />, scratch));
		log.length = 0;
		act(() => render(<Child key="b" name="B" />, scratch));

		expect(log).to.deep.equal(['A cleanup', 'B effect']);
	});

	it('should not rerun when receiving NaN on subsequent renders', () => {
		const calls = [];
		const Component = ({ value }) => {
			const [count, setCount] = useState(0);
			useEffect(() => {
				calls.push('doing effect' + count);
				setCount(count + 1);
				return () => {
					calls.push('cleaning up' + count);
				};
			}, [value]);
			return <p>{count}</p>;
		};
		const App = () => <Component value={Number.NaN} />;

		act(() => {
			render(<App />, scratch);
		});
		expect(calls.length).to.equal(1);
		expect(calls).to.deep.equal(['doing effect0']);
	});
});

// Kept out of the `useEffect` describe, whose assertions install
// `setupRerender` and would replace the default scheduler.
describe('useEffect before a queued rerender', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	// A ref setting state is enough to queue a rerender before the effects of
	// the commit that attached it have run (#3666).
	function setup() {
		const seen = [];
		let ran = false;

		function Child() {
			useEffect(() => {
				ran = true;
			}, []);
			return null;
		}

		function Parent() {
			const [, setNode] = useState(null);
			seen.push(ran);
			return (
				<div ref={setNode}>
					<Child />
				</div>
			);
		}

		return { seen, App: Parent };
	}

	it('runs pending effects before the queued rerender', async () => {
		const { seen, App } = setup();

		render(<App />, scratch);
		await Promise.resolve();

		expect(seen).to.deep.equal([false, true]);
	});

	it('runs pending effects before the queued rerender inside act', () => {
		const { seen, App } = setup();

		act(() => {
			render(<App />, scratch);
		});

		expect(seen).to.deep.equal([false, true]);
	});

	it('reports an effect error before rendering, and the render error after', () => {
		const rerender = setupRerender();
		let setBroken;

		function Thrower() {
			useEffect(() => {
				throw new Error('effect');
			}, []);
			return null;
		}

		function Breaker() {
			const [broken, set] = useState(false);
			setBroken = set;
			if (broken) throw new Error('render');
			return null;
		}

		render(
			<Fragment>
				<Thrower />
				<Breaker />
			</Fragment>,
			scratch
		);
		setBroken(true);

		expect(() => rerender()).to.throw('effect');
		expect(() => rerender()).to.throw('render');
	});

	it('does not run effects of a tree an error boundary discards', async () => {
		const log = [];

		function Sibling() {
			useEffect(() => {
				log.push('mount');
				return () => log.push('cleanup');
			}, []);
			return null;
		}

		function Thrower() {
			throw new Error('boom');
		}

		class Boundary extends Component {
			static getDerivedStateFromError() {
				return { error: true };
			}

			render() {
				return this.state.error ? 'fallback' : this.props.children;
			}
		}

		render(
			<Boundary>
				<Sibling />
				<Thrower />
			</Boundary>,
			scratch
		);
		await new Promise(r => setTimeout(r, 60));

		expect(scratch.textContent).to.equal('fallback');
		expect(log).to.deep.equal([]);
	});

	it('runs layout effects of a commit before its effects when it rerenders synchronously', async () => {
		const prevDebounce = options.debounceRendering;
		const log = [];
		options.debounceRendering = cb => cb();

		function Updater() {
			const [value, set] = useState(0);
			useLayoutEffect(() => set(1), []);
			return value;
		}

		function Logger() {
			useLayoutEffect(() => {
				log.push('layout');
			}, []);
			useEffect(() => {
				log.push('effect');
			}, []);
			return null;
		}

		try {
			render(
				<Fragment>
					<Updater />
					<Logger />
				</Fragment>,
				scratch
			);
		} finally {
			options.debounceRendering = prevDebounce;
		}
		await new Promise(r => setTimeout(r, 60));

		expect(log).to.deep.equal(['layout', 'effect']);
	});
});
