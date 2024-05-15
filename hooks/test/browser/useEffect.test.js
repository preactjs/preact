import { act, teardown as teardownAct } from 'preact/test-utils';
import { createElement, render, Fragment, Component } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useEffectAssertions } from './useEffectAssertions.test';
import { scheduleEffectAssert } from '../_util/useEffectUtil';

/** @jsx createElement */

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
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.not.called;
		expect(callback).to.be.calledOnce;

		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.calledOnce;
		expect(callback).to.be.calledTwice;
	});

	it('cancels the effect when the component get unmounted before it had the chance to run it', () => {
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(null, scratch);

		return scheduleEffectAssert(() => {
			expect(cleanupFunction).to.not.be.called;
			expect(callback).to.not.be.called;
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
		let executionOrder = [];

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
		const spy = sinon.spy();
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
		expect(spy).to.not.be.called;
		expect(scratch.innerHTML).to.equal('<p>loaded</p>');

		act(() => render(<App page={2} />, scratch));
		expect(spy).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		errored = false;

		act(() => render(<App page={1} />, scratch));
		expect(spy).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<p>loaded</p>');
	});

	it('should throw an error upwards from return', () => {
		const spy = sinon.spy();
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
		expect(spy).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('catches errors when error is invoked during render', () => {
		const spy = sinon.spy();
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
		expect(spy).to.be.calledOnce;
		expect(errored).to.be.an('Error').with.property('message', 'hi');
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('should allow creating a new root', () => {
		const root = document.createElement('div');
		const global = document.createElement('div');
		scratch.appendChild(root);
		scratch.appendChild(global);

		const Modal = props => {
			let [, setCanProceed] = useState(true);
			let ChildProp = props.content;

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
		const callback = sinon.spy(() => 'truthy');
		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(callback).to.have.been.calledOnce;

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
		const firstEffectSpy = sinon.spy();
		const firstEffectcleanup = sinon.spy();
		const secondEffectSpy = sinon.spy();
		const secondEffectcleanup = sinon.spy();

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

		expect(firstEffectSpy).to.be.calledOnce;
		expect(secondEffectSpy).to.be.calledOnce;

		act(() => {
			update();
		});

		expect(firstEffectSpy).to.be.calledOnce;
		expect(secondEffectSpy).to.be.calledOnce;
		expect(firstEffectcleanup).to.be.calledOnce;
		expect(secondEffectcleanup).to.be.calledOnce;
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
});
