import React, {
	createElement,
	Fragment,
	useSyncExternalStore,
	render,
	useState,
	useCallback,
	useEffect,
	useLayoutEffect
} from 'preact/compat';
import { setupRerender, act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

const ReactDOM = React;

describe('useSyncExternalStore', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {{ logs: string[], log(arg: string): void; }} */
	const Scheduler = {
		logs: [],
		log(arg) {
			this.logs.push(arg);
		}
	};

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
		Scheduler.logs = [];
	});

	function assertLog(expected) {
		expect(Scheduler.logs).to.deep.equal(expected);
		Scheduler.logs = [];
	}

	function Text({ text }) {
		Scheduler.log(text);
		return text;
	}

	/** @type {(container: Element) => { render(children: React.JSX.Element): void}} */
	function createRoot(container) {
		return {
			render(children) {
				render(children, container);
			}
		};
	}

	function createExternalStore(initialState) {
		const listeners = new Set();
		let currentState = initialState;
		return {
			set(text) {
				currentState = text;
				// ReactDOM.unstable_batchedUpdates(() => {
				listeners.forEach(listener => listener());
				// });
			},
			subscribe(listener) {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
			getState() {
				return currentState;
			},
			getSubscriberCount() {
				return listeners.size;
			}
		};
	}

	it('subscribes and follows effects', () => {
		const subscribe = sinon.spy(() => () => {});
		const getSnapshot = sinon.spy(() => 'hello world');

		const App = () => {
			const value = useSyncExternalStore(subscribe, getSnapshot);
			return <p>{value}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(scratch.innerHTML).to.equal('<p>hello world</p>');
		expect(subscribe).to.be.calledOnce;
		expect(getSnapshot).to.be.calledThrice;
	});

	it('subscribes and rerenders when called', () => {
		/** @type {() => void} */
		let flush;
		const subscribe = sinon.spy(cb => {
			flush = cb;
			return () => {};
		});
		let called = false;
		const getSnapshot = sinon.spy(() => {
			if (called) {
				return 'hello new world';
			}

			return 'hello world';
		});

		const App = () => {
			const value = useSyncExternalStore(subscribe, getSnapshot);
			return <p>{value}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(scratch.innerHTML).to.equal('<p>hello world</p>');
		expect(subscribe).to.be.calledOnce;
		expect(getSnapshot).to.be.calledThrice;

		called = true;
		flush();
		rerender();

		expect(scratch.innerHTML).to.equal('<p>hello new world</p>');
	});

	it('getSnapshot can return NaN without causing infinite loop', () => {
		/** @type {() => void} */
		let flush;
		const subscribe = sinon.spy(cb => {
			flush = cb;
			return () => {};
		});
		let called = false;
		const getSnapshot = sinon.spy(() => {
			if (called) {
				return NaN;
			}

			return 1;
		});

		const App = () => {
			const value = useSyncExternalStore(subscribe, getSnapshot);
			return <p>{value}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(scratch.innerHTML).to.equal('<p>1</p>');
		expect(subscribe).to.be.calledOnce;
		expect(getSnapshot).to.be.calledThrice;

		called = true;
		flush();
		rerender();

		expect(scratch.innerHTML).to.equal('<p>NaN</p>');
	});

	it('should not call function values on subscription', () => {
		/** @type {() => void} */
		let flush;
		const subscribe = sinon.spy(cb => {
			flush = cb;
			return () => {};
		});

		const func = () => 'value: ' + i++;

		let i = 0;
		const getSnapshot = sinon.spy(() => {
			return func;
		});

		const App = () => {
			const value = useSyncExternalStore(subscribe, getSnapshot);
			return <p>{value()}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(scratch.innerHTML).to.equal('<p>value: 0</p>');
		expect(subscribe).to.be.calledOnce;
		expect(getSnapshot).to.be.calledThrice;

		flush();
		rerender();

		expect(scratch.innerHTML).to.equal('<p>value: 0</p>');
	});

	it('should work with changing getSnapshot', () => {
		/** @type {() => void} */
		let flush;
		const subscribe = sinon.spy(cb => {
			flush = cb;
			return () => {};
		});

		let i = 0;
		const App = () => {
			const value = useSyncExternalStore(subscribe, () => {
				return i;
			});
			return <p>value: {value}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(scratch.innerHTML).to.equal('<p>value: 0</p>');
		expect(subscribe).to.be.calledOnce;

		i++;
		flush();
		rerender();

		expect(scratch.innerHTML).to.equal('<p>value: 1</p>');
	});

	it('works with useCallback', () => {
		/** @type {() => void} */
		let toggle;
		const App = () => {
			const [state, setState] = useState(true);
			toggle = setState.bind(this, () => false);

			const value = useSyncExternalStore(
				useCallback(() => {
					return () => {};
				}, [state]),
				() => (state ? 'yep' : 'nope')
			);

			return <p>{value}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(scratch.innerHTML).to.equal('<p>yep</p>');

		toggle();
		rerender();

		expect(scratch.innerHTML).to.equal('<p>nope</p>');
	});

	// The following tests are taken from the React test suite:
	// https://github.com/facebook/react/blob/3e09c27b880e1fecdb1eca5db510ecce37ea6be2/packages/use-sync-external-store/src/__tests__/useSyncExternalStoreShared-test.js
	describe('React useSyncExternalStore test suite', () => {
		it('basic usage', async () => {
			const store = createExternalStore('Initial');

			function App() {
				const text = useSyncExternalStore(store.subscribe, store.getState);
				return <Text text={text} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));

			assertLog(['Initial']);
			expect(container.textContent).to.equal('Initial');

			await act(() => {
				store.set('Updated');
			});
			assertLog(['Updated']);
			expect(container.textContent).to.equal('Updated');
		});

		it('skips re-rendering if nothing changes', async () => {
			const store = createExternalStore('Initial');

			function App() {
				const text = useSyncExternalStore(store.subscribe, store.getState);
				return <Text text={text} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));

			assertLog(['Initial']);
			expect(container.textContent).to.equal('Initial');

			// Update to the same value
			await act(() => {
				store.set('Initial');
			});
			// Should not re-render
			assertLog([]);
			expect(container.textContent).to.equal('Initial');
		});

		it('switch to a different store', async () => {
			const storeA = createExternalStore(0);
			const storeB = createExternalStore(0);

			let setStore;
			function App() {
				const [store, _setStore] = useState(storeA);
				setStore = _setStore;
				const value = useSyncExternalStore(store.subscribe, store.getState);
				return <Text text={value} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));

			assertLog([0]);
			expect(container.textContent).to.equal('0');

			await act(() => {
				storeA.set(1);
			});
			assertLog([1]);
			expect(container.textContent).to.equal('1');

			// Switch stores and update in the same batch
			await act(() => {
				ReactDOM.flushSync(() => {
					// This update will be disregarded
					storeA.set(2);
					setStore(storeB);
				});
			});
			// Now reading from B instead of A
			assertLog([0]);
			expect(container.textContent).to.equal('0');

			// Update A
			await act(() => {
				storeA.set(3);
			});
			// Nothing happened, because we're no longer subscribed to A
			assertLog([]);
			expect(container.textContent).to.equal('0');

			// Update B
			await act(() => {
				storeB.set(1);
			});
			assertLog([1]);
			expect(container.textContent).to.equal('1');
		});

		it('selecting a specific value inside getSnapshot', async () => {
			const store = createExternalStore({ a: 0, b: 0 });

			function A() {
				const a = useSyncExternalStore(
					store.subscribe,
					() => store.getState().a
				);
				return <Text text={'A' + a} />;
			}
			function B() {
				const b = useSyncExternalStore(
					store.subscribe,
					() => store.getState().b
				);
				return <Text text={'B' + b} />;
			}

			function App() {
				return (
					<Fragment>
						<A />
						<B />
					</Fragment>
				);
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));

			assertLog(['A0', 'B0']);
			expect(container.textContent).to.equal('A0B0');

			// Update b but not a
			await act(() => {
				store.set({ a: 0, b: 1 });
			});
			// Only b re-renders
			assertLog(['B1']);
			expect(container.textContent).to.equal('A0B1');

			// Update a but not b
			await act(() => {
				store.set({ a: 1, b: 1 });
			});
			// Only a re-renders
			assertLog(['A1']);
			expect(container.textContent).to.equal('A1B1');
		});

		// In React 18, you can't observe in between a sync render and its
		// passive effects, so this is only relevant to legacy roots
		// @gate enableUseSyncExternalStoreShim
		it("compares to current state before bailing out, even when there's a mutation in between the sync and passive effects", async () => {
			const store = createExternalStore(0);

			function App() {
				const value = useSyncExternalStore(store.subscribe, store.getState);
				useEffect(() => {
					Scheduler.log('Passive effect: ' + value);
				}, [value]);
				return <Text text={value} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));
			assertLog([0, 'Passive effect: 0']);

			// Schedule an update. We'll intentionally not use `act` so that we can
			// insert a mutation before React subscribes to the store in a
			// passive effect.
			store.set(1);
			rerender();
			assertLog([
				1
				// Passive effect hasn't fired yet
			]);
			expect(container.textContent).to.equal('1');

			// Flip the store state back to the previous value.
			store.set(0);
			rerender();
			assertLog([
				'Passive effect: 1',
				// Re-render. If the current state were tracked by updating a ref in a
				// passive effect, then this would break because the previous render's
				// passive effect hasn't fired yet, so we'd incorrectly think that
				// the state hasn't changed.
				0
			]);
			// Should flip back to 0
			expect(container.textContent).to.equal('0');

			// Preact: Wait for 'Passive effect: 0' to flush from the rAF so it doesn't impact other tests
			await new Promise(r => setTimeout(r, 32));
		});

		it('mutating the store in between render and commit when getSnapshot has changed', async () => {
			const store = createExternalStore({ a: 1, b: 1 });

			const getSnapshotA = () => store.getState().a;
			const getSnapshotB = () => store.getState().b;

			function Child1({ step }) {
				const value = useSyncExternalStore(store.subscribe, store.getState);
				useLayoutEffect(() => {
					if (step === 1) {
						// Update B in a layout effect. This happens in the same commit
						// that changed the getSnapshot in Child2. Child2's effects haven't
						// fired yet, so it doesn't have access to the latest getSnapshot. So
						// it can't use the getSnapshot to bail out.
						Scheduler.log('Update B in commit phase');
						store.set({ a: value.a, b: 2 });
					}
				}, [step]);
				return null;
			}

			function Child2({ step }) {
				const label = step === 0 ? 'A' : 'B';
				const getSnapshot = step === 0 ? getSnapshotA : getSnapshotB;
				const value = useSyncExternalStore(store.subscribe, getSnapshot);
				return <Text text={label + value} />;
			}

			let setStep;
			function App() {
				const [step, _setStep] = useState(0);
				setStep = _setStep;
				return (
					<>
						<Child1 step={step} />
						<Child2 step={step} />
					</>
				);
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));
			assertLog(['A1']);
			expect(container.textContent).to.equal('A1');

			await act(() => {
				// Change getSnapshot and update the store in the same batch
				setStep(1);
			});
			assertLog([
				'B1',
				'Update B in commit phase',
				// If Child2 had used the old getSnapshot to bail out, then it would have
				// incorrectly bailed out here instead of re-rendering.
				'B2'
			]);
			expect(container.textContent).to.equal('B2');
		});

		it('mutating the store in between render and commit when getSnapshot has _not_ changed', async () => {
			// Same as previous test, but `getSnapshot` does not change
			const store = createExternalStore({ a: 1, b: 1 });

			const getSnapshotA = () => store.getState().a;

			function Child1({ step }) {
				const value = useSyncExternalStore(store.subscribe, store.getState);
				useLayoutEffect(() => {
					if (step === 1) {
						// Update B in a layout effect. This happens in the same commit
						// that changed the getSnapshot in Child2. Child2's effects haven't
						// fired yet, so it doesn't have access to the latest getSnapshot. So
						// it can't use the getSnapshot to bail out.
						Scheduler.log('Update B in commit phase');
						store.set({ a: value.a, b: 2 });
					}
				}, [step]);
				return null;
			}

			function Child2({ step }) {
				const value = useSyncExternalStore(store.subscribe, getSnapshotA);
				return <Text text={'A' + value} />;
			}

			let setStep;
			function App() {
				const [step, _setStep] = useState(0);
				setStep = _setStep;
				return (
					<>
						<Child1 step={step} />
						<Child2 step={step} />
					</>
				);
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));
			assertLog(['A1']);
			expect(container.textContent).to.equal('A1');

			// This will cause a layout effect, and in the layout effect we'll update
			// the store
			await act(() => {
				setStep(1);
			});
			assertLog([
				'A1',
				// This updates B, but since Child2 doesn't subscribe to B, it doesn't
				// need to re-render.
				'Update B in commit phase'
				// No re-render
			]);
			expect(container.textContent).to.equal('A1');
		});

		it("does not bail out if the previous update hasn't finished yet", async () => {
			const store = createExternalStore(0);

			function Child1() {
				const value = useSyncExternalStore(store.subscribe, store.getState);
				useLayoutEffect(() => {
					if (value === 1) {
						Scheduler.log('Reset back to 0');
						store.set(0);
					}
				}, [value]);
				return <Text text={value} />;
			}

			function Child2() {
				const value = useSyncExternalStore(store.subscribe, store.getState);
				return <Text text={value} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() =>
				root.render(
					<>
						<Child1 />
						<Child2 />
					</>
				)
			);
			assertLog([0, 0]);
			expect(container.textContent).to.equal('00');

			await act(() => {
				store.set(1);
			});
			// Preact logs differ from React here cuz of how we do rerendering. We
			// rerender subtrees and then commit effects so Child2 never sees the
			// update to 1 cuz Child1 rerenders and runs its layout effects first.
			assertLog([1, /*1,*/ 'Reset back to 0', 0, 0]);
			expect(container.textContent).to.equal('00');
		});

		it('uses the latest getSnapshot, even if it changed in the same batch as a store update', async () => {
			const store = createExternalStore({ a: 0, b: 0 });

			const getSnapshotA = () => store.getState().a;
			const getSnapshotB = () => store.getState().b;

			let setGetSnapshot;
			function App() {
				const [getSnapshot, _setGetSnapshot] = useState(() => getSnapshotA);
				setGetSnapshot = _setGetSnapshot;
				const text = useSyncExternalStore(store.subscribe, getSnapshot);
				return <Text text={text} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));
			assertLog([0]);

			// Update the store and getSnapshot at the same time
			await act(() => {
				ReactDOM.flushSync(() => {
					setGetSnapshot(() => getSnapshotB);
					store.set({ a: 1, b: 2 });
				});
			});
			// It should read from B instead of A
			assertLog([2]);
			expect(container.textContent).to.equal('2');
		});

		it('handles errors thrown by getSnapshot', async () => {
			class ErrorBoundary extends React.Component {
				state = { error: null };
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					if (this.state.error) {
						return <Text text={this.state.error.message} />;
					}
					return this.props.children;
				}
			}

			const store = createExternalStore({
				value: 0,
				throwInGetSnapshot: false,
				throwInIsEqual: false
			});

			function App() {
				const { value } = useSyncExternalStore(store.subscribe, () => {
					const state = store.getState();
					if (state.throwInGetSnapshot) {
						throw new Error('Error in getSnapshot');
					}
					return state;
				});
				return <Text text={value} />;
			}

			const errorBoundary = React.createRef();
			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() =>
				root.render(
					<ErrorBoundary ref={errorBoundary}>
						<App />
					</ErrorBoundary>
				)
			);
			assertLog([0]);
			expect(container.textContent).to.equal('0');

			// Update that throws in a getSnapshot. We can catch it with an error boundary.
			await act(() => {
				store.set({
					value: 1,
					throwInGetSnapshot: true,
					throwInIsEqual: false
				});
			});

			assertLog(['Error in getSnapshot']);
			expect(container.textContent).to.equal('Error in getSnapshot');
		});

		it.skip('Infinite loop if getSnapshot keeps returning new reference', async () => {
			const store = createExternalStore({});

			function App() {
				const text = useSyncExternalStore(store.subscribe, () => ({}));
				return <Text text={JSON.stringify(text)} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);

			expect(() => ReactDOM.flushSync(() => root.render(<App />))).to.throw(
				'Maximum update depth exceeded. This can happen when a component repeatedly ' +
					'calls setState inside componentWillUpdate or componentDidUpdate. React limits ' +
					'the number of nested updates to prevent infinite loops.'
			);
		});

		it('getSnapshot can return NaN without infinite loop warning', async () => {
			const store = createExternalStore('not a number');

			function App() {
				const value = useSyncExternalStore(store.subscribe, () =>
					parseInt(store.getState(), 10)
				);
				return <Text text={value} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);

			// Initial render that reads a snapshot of NaN. This is OK because we use
			// Object.is algorithm to compare values.
			await act(() => root.render(<App />));
			expect(container.textContent).to.equal('NaN');

			// Update to real number
			await act(() => store.set(123));
			expect(container.textContent).to.equal('123');

			// Update back to NaN
			await act(() => store.set('not a number'));
			expect(container.textContent).to.equal('NaN');
		});

		describe.skip('extra features implemented in user-space', () => {
			// The selector implementation uses the lazy ref initialization pattern
			// @gate !(enableUseRefAccessWarning && __DEV__)
			it('memoized selectors are only called once per update', async () => {
				const store = createExternalStore({ a: 0, b: 0 });

				function selector(state) {
					Scheduler.log('Selector');
					return state.a;
				}

				function App() {
					Scheduler.log('App');
					const a = useSyncExternalStoreWithSelector(
						store.subscribe,
						store.getState,
						null,
						selector
					);
					return <Text text={'A' + a} />;
				}

				const container = document.createElement('div');
				const root = createRoot(container);
				await act(() => root.render(<App />));

				assertLog(['App', 'Selector', 'A0']);
				expect(container.textContent).to.equal('A0');

				// Update the store
				await act(() => {
					store.set({ a: 1, b: 0 });
				});
				assertLog([
					// The selector runs before React starts rendering
					'Selector',
					'App',
					// And because the selector didn't change during render, we can reuse
					// the previous result without running the selector again
					'A1'
				]);
				expect(container.textContent).to.equal('A1');
			});

			// The selector implementation uses the lazy ref initialization pattern
			// @gate !(enableUseRefAccessWarning && __DEV__)
			it('Using isEqual to bailout', async () => {
				const store = createExternalStore({ a: 0, b: 0 });

				function A() {
					const { a } = useSyncExternalStoreWithSelector(
						store.subscribe,
						store.getState,
						null,
						state => ({ a: state.a }),
						(state1, state2) => state1.a === state2.a
					);
					return <Text text={'A' + a} />;
				}
				function B() {
					const { b } = useSyncExternalStoreWithSelector(
						store.subscribe,
						store.getState,
						null,
						state => {
							return { b: state.b };
						},
						(state1, state2) => state1.b === state2.b
					);
					return <Text text={'B' + b} />;
				}

				function App() {
					return (
						<>
							<A />
							<B />
						</>
					);
				}

				const container = document.createElement('div');
				const root = createRoot(container);
				await act(() => root.render(<App />));

				assertLog(['A0', 'B0']);
				expect(container.textContent).to.equal('A0B0');

				// Update b but not a
				await act(() => {
					store.set({ a: 0, b: 1 });
				});
				// Only b re-renders
				assertLog(['B1']);
				expect(container.textContent).to.equal('A0B1');

				// Update a but not b
				await act(() => {
					store.set({ a: 1, b: 1 });
				});
				// Only a re-renders
				assertLog(['A1']);
				expect(container.textContent).to.equal('A1B1');
			});

			it('basic server hydration', async () => {
				const store = createExternalStore('client');

				const ref = React.createRef();
				function App() {
					const text = useSyncExternalStore(
						store.subscribe,
						store.getState,
						() => 'server'
					);
					useEffect(() => {
						Scheduler.log('Passive effect: ' + text);
					}, [text]);
					return (
						<div ref={ref}>
							<Text text={text} />
						</div>
					);
				}

				const container = document.createElement('div');
				container.innerHTML = '<div>server</div>';
				const serverRenderedDiv = container.getElementsByTagName('div')[0];

				if (gate(flags => !flags.enableUseSyncExternalStoreShim)) {
					await act(() => {
						ReactDOMClient.hydrateRoot(container, <App />);
					});
					assertLog([
						// First it hydrates the server rendered HTML
						'server',
						'Passive effect: server',
						// Then in a second paint, it re-renders with the client state
						'client',
						'Passive effect: client'
					]);
				} else {
					// In the userspace shim, there's no mechanism to detect whether we're
					// currently hydrating, so `getServerSnapshot` is not called on the
					// client. To avoid this server mismatch warning, user must account for
					// this themselves and return the correct value inside `getSnapshot`.
					await act(() => {
						expect(() => ReactDOM.hydrate(<App />, container)).toErrorDev(
							'Text content did not match'
						);
					});
					assertLog(['client', 'Passive effect: client']);
				}
				expect(container.textContent).to.equal('client');
				expect(ref.current).to.equal(serverRenderedDiv);
			});
		});

		it('regression test for facebook/react#23150', async () => {
			const store = createExternalStore('Initial');

			function App() {
				const text = useSyncExternalStore(store.subscribe, store.getState);
				const [derivedText, setDerivedText] = useState(text);
				useEffect(() => {}, []);
				if (derivedText !== text.toUpperCase()) {
					setDerivedText(text.toUpperCase());
				}
				return <Text text={derivedText} />;
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => root.render(<App />));

			assertLog(['INITIAL']);
			expect(container.textContent).to.equal('INITIAL');

			await act(() => {
				store.set('Updated');
			});
			assertLog(['UPDATED']);
			expect(container.textContent).to.equal('UPDATED');
		});

		// The selector implementation uses the lazy ref initialization pattern
		// @gate !(enableUseRefAccessWarning && __DEV__)
		it.skip('compares selection to rendered selection even if selector changes', async () => {
			const store = createExternalStore({ items: ['A', 'B'] });

			const shallowEqualArray = (a, b) => {
				if (a.length !== b.length) {
					return false;
				}
				for (let i = 0; i < a.length; i++) {
					if (a[i] !== b[i]) {
						return false;
					}
				}
				return true;
			};

			const List = React.memo(({ items }) => {
				return (
					<ul>
						{items.map(text => (
							<li key={text}>
								<Text key={text} text={text} />
							</li>
						))}
					</ul>
				);
			});

			function App({ step }) {
				const inlineSelector = state => {
					Scheduler.log('Inline selector');
					return [...state.items, 'C'];
				};
				const items = useSyncExternalStoreWithSelector(
					store.subscribe,
					store.getState,
					null,
					inlineSelector,
					shallowEqualArray
				);
				return (
					<>
						<List items={items} />
						<Text text={'Sibling: ' + step} />
					</>
				);
			}

			const container = document.createElement('div');
			const root = createRoot(container);
			await act(() => {
				root.render(<App step={0} />);
			});
			assertLog(['Inline selector', 'A', 'B', 'C', 'Sibling: 0']);

			await act(() => {
				root.render(<App step={1} />);
			});
			assertLog([
				// We had to call the selector again because it's not memoized
				'Inline selector',

				// But because the result was the same (according to isEqual) we can
				// bail out of rendering the memoized list. These are skipped:
				// 'A',
				// 'B',
				// 'C',

				'Sibling: 1'
			]);
		});

		describe.skip('selector and isEqual error handling in extra', () => {
			let ErrorBoundary;
			beforeEach(() => {
				ErrorBoundary = class extends React.Component {
					state = { error: null };
					static getDerivedStateFromError(error) {
						return { error };
					}
					render() {
						if (this.state.error) {
							return <Text text={this.state.error.message} />;
						}
						return this.props.children;
					}
				};
			});

			it('selector can throw on update', async () => {
				const store = createExternalStore({ a: 'a' });
				const selector = state => {
					if (typeof state.a !== 'string') {
						throw new TypeError('Malformed state');
					}
					return state.a.toUpperCase();
				};

				function App() {
					const a = useSyncExternalStoreWithSelector(
						store.subscribe,
						store.getState,
						null,
						selector
					);
					return <Text text={a} />;
				}

				const container = document.createElement('div');
				const root = createRoot(container);
				await act(() =>
					root.render(
						<ErrorBoundary>
							<App />
						</ErrorBoundary>
					)
				);

				expect(container.textContent).to.equal('A');

				await expect(async () => {
					await act(() => {
						store.set({});
					});
				}).toWarnDev(
					ReactFeatureFlags.enableUseRefAccessWarning
						? ['Warning: App: Unsafe read of a mutable value during render.']
						: []
				);
				expect(container.textContent).to.equal('Malformed state');
			});

			it('isEqual can throw on update', async () => {
				const store = createExternalStore({ a: 'A' });
				const selector = state => state.a;
				const isEqual = (left, right) => {
					if (typeof left.a !== 'string' || typeof right.a !== 'string') {
						throw new TypeError('Malformed state');
					}
					return left.a.trim() === right.a.trim();
				};

				function App() {
					const a = useSyncExternalStoreWithSelector(
						store.subscribe,
						store.getState,
						null,
						selector,
						isEqual
					);
					return <Text text={a} />;
				}

				const container = document.createElement('div');
				const root = createRoot(container);
				await act(() =>
					root.render(
						<ErrorBoundary>
							<App />
						</ErrorBoundary>
					)
				);

				expect(container.textContent).to.equal('A');

				await expect(async () => {
					await act(() => {
						store.set({});
					});
				}).toWarnDev(
					ReactFeatureFlags.enableUseRefAccessWarning
						? ['Warning: App: Unsafe read of a mutable value during render.']
						: []
				);
				expect(container.textContent).to.equal('Malformed state');
			});
		});
	});
});
