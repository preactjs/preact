import { act } from 'preact/test-utils';
import { createElement, render, Fragment, Component } from 'preact';
import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';
import { useEffectAssertions } from './useEffectAssertions.test';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

/** @jsx createElement */

describe('useLayoutEffect', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	// Layout effects fire synchronously
	const scheduleEffectAssert = assertFn =>
		new Promise(resolve => {
			assertFn();
			resolve();
		});

	useEffectAssertions(useLayoutEffect, scheduleEffectAssert);

	it('calls the effect immediately after render', () => {
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useLayoutEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.calledOnce;
		expect(callback).to.be.calledTwice;

		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.calledTwice;
		expect(callback).to.be.calledThrice;
	});

	it('works on a nested component', () => {
		const callback = sinon.spy();

		function Parent() {
			return (
				<div>
					<Child />
				</div>
			);
		}

		function Child() {
			useLayoutEffect(callback);
			return null;
		}

		render(<Parent />, scratch);

		expect(callback).to.be.calledOnce;
	});

	it('should execute multiple layout effects in same component in the right order', () => {
		let executionOrder = [];
		const App = ({ i }) => {
			executionOrder = [];
			useLayoutEffect(() => {
				executionOrder.push('action1');
				return () => executionOrder.push('cleanup1');
			}, [i]);
			useLayoutEffect(() => {
				executionOrder.push('action2');
				return () => executionOrder.push('cleanup2');
			}, [i]);
			return <p>Test</p>;
		};
		render(<App i={0} />, scratch);
		render(<App i={2} />, scratch);
		expect(executionOrder).to.deep.equal([
			'cleanup1',
			'cleanup2',
			'action1',
			'action2'
		]);
	});

	it('should correctly display DOM', () => {
		function AutoResizeTextareaLayoutEffect(props) {
			const ref = useRef(null);
			useLayoutEffect(() => {
				// IE & Edge put textarea's value as child of textarea when reading innerHTML so use
				// cross browser serialize helper
				const actualHtml = serializeHtml(scratch);
				const expectedHTML = `<div class="${props.value}"><p>${props.value}</p><textarea></textarea></div>`;
				expect(actualHtml).to.equal(expectedHTML);
				expect(document.body.contains(ref.current)).to.equal(true);
			});
			return (
				<Fragment>
					<p>{props.value}</p>
					<textarea ref={ref} value={props.value} onChange={props.onChange} />
				</Fragment>
			);
		}

		function App(props) {
			return (
				<div class={props.value}>
					<AutoResizeTextareaLayoutEffect {...props} />
				</div>
			);
		}

		render(<App value="hi" />, scratch);
		render(<App value="hii" />, scratch);
	});

	it('should invoke layout effects after subtree is fully connected', () => {
		let ref;
		let layoutEffect = sinon.spy(() => {
			const isConnected = document.body.contains(ref.current);
			expect(isConnected).to.equal(true, 'isConnected');
		});

		function Inner() {
			ref = useRef(null);
			useLayoutEffect(layoutEffect);
			return (
				<Fragment>
					<textarea ref={ref} />
					<span>hello</span>;
				</Fragment>
			);
		}

		function Outer() {
			return (
				<div>
					<Inner />
				</div>
			);
		}

		render(<Outer />, scratch);
		expect(layoutEffect).to.have.been.calledOnce;
	});

	// TODO: Make this test pass to resolve issue #1886
	it.skip('should call effects correctly when unmounting', () => {
		let onClick, calledFoo, calledBar, calledFooCleanup, calledBarCleanup;

		const Foo = () => {
			useLayoutEffect(() => {
				if (!calledFoo) calledFoo = scratch.innerHTML;
				return () => {
					if (!calledFooCleanup) calledFooCleanup = scratch.innerHTML;
				};
			}, []);

			return (
				<div>
					<p>Foo</p>
				</div>
			);
		};

		const Bar = () => {
			useLayoutEffect(() => {
				if (!calledBar) calledBar = scratch.innerHTML;
				return () => {
					if (!calledBarCleanup) calledBarCleanup = scratch.innerHTML;
				};
			}, []);

			return (
				<div>
					<p>Bar</p>
				</div>
			);
		};

		function App() {
			const [current, setCurrent] = useState('/foo');

			onClick = () => setCurrent(current === '/foo' ? '/bar' : '/foo');

			return (
				<Fragment>
					<button onClick={onClick}>next</button>

					{current === '/foo' && <Foo />}
					{current === '/bar' && <Bar />}
				</Fragment>
			);
		}

		render(<App />, scratch);
		expect(calledFoo).to.equal(
			'<button>next</button><div><p>Foo</p></div>',
			'calledFoo'
		);

		act(() => onClick());
		expect(calledFooCleanup).to.equal(
			'<button>next</button><div><p>Bar</p></div>',
			'calledFooCleanup'
		);
		expect(calledBar).to.equal(
			'<button>next</button><div><p>Bar</p></div>',
			'calledBar'
		);

		act(() => onClick());
		expect(calledBarCleanup).to.equal(
			'<button>next</button><div><p>Foo</p></div>',
			'calledBarCleanup'
		);
	});

	it('should throw an error upwards', () => {
		const spy = sinon.spy();
		let errored = false;

		const Page1 = () => {
			const [state, setState] = useState('loading');
			useLayoutEffect(() => {
				setState('loaded');
			}, []);
			return <p>{state}</p>;
		};

		const Page2 = () => {
			useLayoutEffect(() => {
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
			useLayoutEffect(() => {
				setState('loaded');
			}, []);
			return <p>{state}</p>;
		};

		const Page2 = () => {
			useLayoutEffect(() => {
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

	it('orders effects effectively', () => {
		const calls = [];
		const GrandChild = ({ id }) => {
			useLayoutEffect(() => {
				calls.push(`${id} - Effect`);
				return () => {
					calls.push(`${id} - Cleanup`);
				};
			}, [id]);
			return <p>{id}</p>;
		};

		const Child = ({ id }) => {
			useLayoutEffect(() => {
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
			useLayoutEffect(() => {
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

			useLayoutEffect(() => {
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

			useLayoutEffect(() => {
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

			useLayoutEffect(() => {
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

	it('should run layout affects after all refs are invoked', () => {
		const calls = [];
		const verifyRef = name => el => {
			calls.push(name);
			expect(document.body.contains(el), name).to.equal(true);
		};

		const App = () => {
			const ref = useRef();
			useLayoutEffect(() => {
				expect(ref.current).to.equalNode(scratch.querySelector('p'));

				calls.push('doing effect');
				return () => {
					calls.push('cleaning up');
				};
			});

			return (
				<div ref={verifyRef('callback ref outer')}>
					<p ref={ref}>
						<span ref={verifyRef('callback ref inner')}>Hi</span>
					</p>
				</div>
			);
		};

		act(() => {
			render(<App />, scratch);
		});
		expect(calls).to.deep.equal([
			'callback ref inner',
			'callback ref outer',
			'doing effect'
		]);
	});
});
