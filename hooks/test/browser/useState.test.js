import { setupRerender, act } from 'preact/test-utils';
import { createElement, render, createContext, Component } from 'preact';
import { useState, useContext, useEffect } from 'preact/hooks';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

describe('useState', () => {
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

	it('serves the same state across render calls', () => {
		const stateHistory = [];

		function Comp() {
			const [state] = useState({ a: 1 });
			stateHistory.push(state);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(stateHistory).to.deep.equal([{ a: 1 }, { a: 1 }]);
		expect(stateHistory[0]).to.equal(stateHistory[1]);
	});

	it('can initialize the state via a function', () => {
		const initState = sinon.spy(() => 1);

		function Comp() {
			useState(initState);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(initState).to.be.calledOnce;
	});

	it('does not rerender on equal state', () => {
		let lastState;
		let doSetState;

		const Comp = sinon.spy(() => {
			const [state, setState] = useState(0);
			lastState = state;
			doSetState = setState;
			return null;
		});

		render(<Comp />, scratch);
		expect(lastState).to.equal(0);
		expect(Comp).to.be.calledOnce;

		doSetState(0);
		rerender();
		expect(lastState).to.equal(0);
		expect(Comp).to.be.calledOnce;

		doSetState(() => 0);
		rerender();
		expect(lastState).to.equal(0);
		expect(Comp).to.be.calledOnce;
	});

	it('rerenders when setting the state', () => {
		let lastState;
		let doSetState;

		const Comp = sinon.spy(() => {
			const [state, setState] = useState(0);
			lastState = state;
			doSetState = setState;
			return null;
		});

		render(<Comp />, scratch);
		expect(lastState).to.equal(0);
		expect(Comp).to.be.calledOnce;

		doSetState(1);
		rerender();
		expect(lastState).to.equal(1);
		expect(Comp).to.be.calledTwice;

		// Updater function style
		doSetState(current => current * 10);
		rerender();
		expect(lastState).to.equal(10);
		expect(Comp).to.be.calledThrice;
	});

	it('can be set by another component', () => {
		function StateContainer() {
			const [count, setCount] = useState(0);
			return (
				<div>
					<p>Count: {count}</p>
					<Increment increment={() => setCount(c => c + 10)} />
				</div>
			);
		}

		function Increment(props) {
			return <button onClick={props.increment}>Increment</button>;
		}

		render(<StateContainer />, scratch);
		expect(scratch.textContent).to.include('Count: 0');

		const button = scratch.querySelector('button');
		button.click();

		rerender();
		expect(scratch.textContent).to.include('Count: 10');
	});

	it('should correctly initialize', () => {
		let scopedThing = 'hi';
		let arg;

		function useSomething() {
			const args = useState(setup);
			function setup(thing = scopedThing) {
				arg = thing;
				return thing;
			}
			return args;
		}

		const App = () => {
			const [state] = useSomething();
			return <p>{state}</p>;
		};

		render(<App />, scratch);

		expect(arg).to.equal('hi');
		expect(scratch.innerHTML).to.equal('<p>hi</p>');
	});

	it('should correctly re-initialize when first run threw an error', () => {
		let hasThrown = false;
		let setup = sinon.spy(() => {
			if (!hasThrown) {
				hasThrown = true;
				throw new Error('test');
			} else {
				return 'hi';
			}
		});

		const App = () => {
			const state = useState(setup)[0];
			return <p>{state}</p>;
		};

		expect(() => render(<App />, scratch)).to.throw('test');
		expect(setup).to.have.been.calledOnce;
		expect(() => render(<App />, scratch)).not.to.throw();
		expect(setup).to.have.been.calledTwice;
		expect(scratch.innerHTML).to.equal('<p>hi</p>');
	});

	it('should handle queued useState', () => {
		function Message({ message, onClose }) {
			const [isVisible, setVisible] = useState(Boolean(message));
			const [prevMessage, setPrevMessage] = useState(message);

			if (message !== prevMessage) {
				setPrevMessage(message);
				setVisible(Boolean(message));
			}

			if (!isVisible) {
				return null;
			}
			return <p onClick={onClose}>{message}</p>;
		}

		function App() {
			const [message, setMessage] = useState('Click Here!!');
			return (
				<Message
					onClose={() => {
						setMessage('');
					}}
					message={message}
				/>
			);
		}

		render(<App />, scratch);
		expect(scratch.textContent).to.equal('Click Here!!');
		const text = scratch.querySelector('p');
		text.click();
		rerender();
		expect(scratch.innerHTML).to.equal('');
	});

	it('should render a second time when the render function updates state', () => {
		const calls = [];
		const App = () => {
			const [greeting, setGreeting] = useState('bye');

			if (greeting === 'bye') {
				setGreeting('hi');
			}

			calls.push(greeting);

			return <p>{greeting}</p>;
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(calls.length).to.equal(2);
		expect(calls).to.deep.equal(['bye', 'hi']);
		expect(scratch.textContent).to.equal('hi');
	});

	// https://github.com/preactjs/preact/issues/3669
	it('correctly updates with multiple state updates', () => {
		let simulateClick;
		function TestWidget() {
			const [saved, setSaved] = useState(false);
			const [, setSaving] = useState(false);

			simulateClick = () => {
				setSaving(true);
				setSaved(true);
				setSaving(false);
			};

			return <div>{saved ? 'Saved!' : 'Unsaved!'}</div>;
		}

		render(<TestWidget />, scratch);
		expect(scratch.innerHTML).to.equal('<div>Unsaved!</div>');

		act(() => {
			simulateClick();
		});

		expect(scratch.innerHTML).to.equal('<div>Saved!</div>');
	});

	// https://github.com/preactjs/preact/issues/3674
	it('ensure we iterate over all hooks', () => {
		let open, close;

		function TestWidget() {
			const [, setCounter] = useState(0);
			const [isOpen, setOpen] = useState(false);

			open = () => {
				setCounter(42);
				setOpen(true);
			};

			close = () => {
				setOpen(false);
			};

			return <div>{isOpen ? 'open' : 'closed'}</div>;
		}

		render(<TestWidget />, scratch);
		expect(scratch.innerHTML).to.equal('<div>closed</div>');

		act(() => {
			open();
		});

		expect(scratch.innerHTML).to.equal('<div>open</div>');

		act(() => {
			close();
		});
		expect(scratch.innerHTML).to.equal('<div>closed</div>');
	});

	it('does not loop when states are equal after batches', () => {
		const renderSpy = sinon.spy();
		const Context = createContext(null);

		function ModalProvider(props) {
			let [modalCount, setModalCount] = useState(0);
			renderSpy(modalCount);
			let context = {
				modalCount,
				addModal() {
					setModalCount(count => count + 1);
				},
				removeModal() {
					setModalCount(count => count - 1);
				}
			};

			return (
				<Context.Provider value={context}>{props.children}</Context.Provider>
			);
		}

		function useModal() {
			let context = useContext(Context);
			useEffect(() => {
				context.addModal();
				return () => {
					context.removeModal();
				};
			}, [context]);
		}

		function Popover() {
			useModal();
			return <div>Popover</div>;
		}

		function App() {
			return (
				<ModalProvider>
					<Popover />
				</ModalProvider>
			);
		}

		act(() => {
			render(<App />, scratch);
		});

		expect(renderSpy).to.be.calledTwice;
	});

	// see preactjs/preact#3731
	it('respects updates initiated from the parent', () => {
		let setChild, setParent;
		const Child = props => {
			const [, setState] = useState(false);
			setChild = setState;
			return <p>{props.text}</p>;
		};

		const Parent = () => {
			const [state, setState] = useState('hello world');
			setParent = setState;
			return <Child text={state} />;
		};

		render(<Parent />, scratch);
		expect(scratch.innerHTML).to.equal('<p>hello world</p>');

		setParent('hello world!!!');
		setChild(true);
		setChild(false);
		rerender();
		expect(scratch.innerHTML).to.equal('<p>hello world!!!</p>');
	});

	it('should limit rerenders when setting state to NaN', () => {
		const calls = [];
		const App = ({ i }) => {
			calls.push('rendering' + i);
			const [greeting, setGreeting] = useState(0);

			if (i === 2) {
				setGreeting(NaN);
			}

			return <p>{greeting}</p>;
		};

		act(() => {
			render(<App i={1} />, scratch);
		});
		expect(calls.length).to.equal(1);
		expect(calls).to.deep.equal(['rendering1']);

		act(() => {
			render(<App i={2} />, scratch);
		});
		expect(calls.length).to.equal(3);
		expect(calls.slice(1).every(c => c === 'rendering2')).to.equal(true);
	});

	describe('Global sCU', () => {
		let prevScu;
		before(() => {
			prevScu = Component.prototype.shouldComponentUpdate;
			Component.prototype.shouldComponentUpdate = () => {
				return true;
			};
		});

		after(() => {
			Component.prototype.shouldComponentUpdate = prevScu;
		});

		it('correctly updates with multiple state updates', () => {
			let simulateClick;

			let renders = 0;
			function TestWidget() {
				renders++;
				const [saved, setSaved] = useState(false);

				simulateClick = () => {
					setSaved(true);
					setSaved(false);
				};

				return <div>{saved ? 'Saved!' : 'Unsaved!'}</div>;
			}

			render(<TestWidget />, scratch);
			expect(scratch.innerHTML).to.equal('<div>Unsaved!</div>');
			expect(renders).to.equal(1);

			act(() => {
				simulateClick();
			});

			expect(scratch.innerHTML).to.equal('<div>Unsaved!</div>');
			expect(renders).to.equal(2);
		});
	});
});
