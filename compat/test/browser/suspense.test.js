import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	render,
	Component,
	Suspense,
	Fragment,
	createContext,
	useState
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { div } from '../../../test/_util/dom';
import { createLazy, createSuspender } from './suspense-utils';

const h = React.createElement;
/* eslint-env browser, mocha */

class Catcher extends Component {
	constructor(props) {
		super(props);
		this.state = { error: false };
	}

	componentDidCatch(e) {
		if (e.then) {
			this.setState({ error: { message: '{Promise}' } });
		} else {
			this.setState({ error: e });
		}
	}

	render(props, state) {
		return state.error ? (
			<div>Catcher did catch: {state.error.message}</div>
		) : (
			props.children
		);
	}
}

describe.skip('suspense', () => {
	/** @type {HTMLDivElement} */
	let scratch,
		rerender,
		unhandledEvents = [];

	function onUnhandledRejection(event) {
		unhandledEvents.push(event);
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		unhandledEvents = [];
		if ('onunhandledrejection' in window) {
			window.addEventListener('unhandledrejection', onUnhandledRejection);
		}
	});

	afterEach(() => {
		teardown(scratch);

		if ('onunhandledrejection' in window) {
			window.removeEventListener('unhandledrejection', onUnhandledRejection);

			if (unhandledEvents.length) {
				throw unhandledEvents[0].reason;
			}
		}
	});

	it('should support lazy', () => {
		const [Lazy, resolve] = createLazy();
		const LazyResult = ({ name }) => <div>Hello from {name}</div>;

		// Render initial state
		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Lazy name="LazyComp" />
			</Suspense>,
			scratch
		);
		expect(Lazy).to.have.been.calledOnce;

		// Re-render fallback cuz lazy threw
		rerender();
		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
		expect(Lazy).to.have.been.calledOnce;

		return resolve(LazyResult).then(() => {
			// Re-render result
			rerender();
			expect(scratch.innerHTML).to.eql(`<div>Hello from LazyComp</div>`);
			expect(Lazy).to.have.been.calledTwice;
		});
	});

	it('should support suspending after initial render', () => {
		const [Suspender, suspend] = createSuspender(() => <div>initial</div>);

		function App() {
			return (
				<Suspense fallback={<div>Suspended...</div>}>
					<Suspender />
				</Suspense>
			);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(`<div>initial</div>`);

		const [resolve, _, Lazy] = suspend();
		rerender();
		expect(scratch.innerHTML).to.equal(`<div>Suspended...</div>`);
		// Lazy is called once during the first render when it throws
		expect(Lazy).to.have.been.calledOnce;

		return resolve(() => (
			<Fragment>
				<div>resolved 1</div>
				<div>resolved 2</div>
			</Fragment>
		)).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(
				`<div>resolved 1</div><div>resolved 2</div>`
			);
			expect(Lazy).to.have.been.calledTwice;
		});
	});

	it('should support a call to setState before rendering the fallback', () => {
		const [Lazy, resolve] = createLazy();
		const LazyResult = ({ name }) => <div>Hello from {name}</div>;

		/** @type {(arg: object) => void} */
		let setState;
		class App extends Component {
			constructor(props) {
				super(props);
				this.state = {};
				setState = this.setState.bind(this);
			}
			render(props, state) {
				return (
					<Fragment>
						<Suspense fallback={<div>Suspended...</div>}>
							<Lazy name="LazyComp" />
						</Suspense>
					</Fragment>
				);
			}
		}

		render(<App />, scratch); // Render initial state

		setState({ foo: 'bar' });
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(LazyResult).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`<div>Hello from LazyComp</div>`);
		});
	});

	it('lazy should forward refs', () => {
		const [Lazy, resolve] = createLazy();
		const LazyResult = () => <div>Hello from LazyComp</div>;
		let ref = { current: null };

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Lazy ref={ref} />
			</Suspense>,
			scratch
		);
		rerender();

		return resolve(LazyResult).then(() => {
			rerender();
			expect(ref.current.constructor).to.equal(LazyResult);
		});
	});

	it('should suspend when a promise is thrown', () => {
		class ClassWrapper extends Component {
			render(props) {
				return <div id="class-wrapper">{props.children}</div>;
			}
		}

		const FuncWrapper = props => <div id="func-wrapper">{props.children}</div>;

		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<ClassWrapper>
					<FuncWrapper>
						<Suspender />
					</FuncWrapper>
				</ClassWrapper>
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div id="class-wrapper"><div id="func-wrapper"><div>Hello</div></div></div>`
		);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(() => <div>Hello2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div id="class-wrapper"><div id="func-wrapper"><div>Hello2</div></div></div>`
			);
		});
	});

	it('should not call lifecycle methods of an initially suspending component', () => {
		/** @type {() => Promise<void>} */
		let resolve;
		let resolved = false;
		const promise = new Promise(_resolve => {
			resolve = () => {
				resolved = true;
				_resolve();
				return promise;
			};
		});

		class LifecycleSuspender extends Component {
			render() {
				if (!resolved) {
					throw promise;
				}
				return <div>Lifecycle</div>;
			}

			componentWillMount() {}
			componentDidMount() {}
			componentWillUnmount() {}
		}

		const lifecycles = LifecycleSuspender.prototype;
		sinon.spy(lifecycles, 'componentWillMount');
		sinon.spy(lifecycles, 'componentDidMount');
		sinon.spy(lifecycles, 'componentWillUnmount');

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<LifecycleSuspender />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(``);
		expect(lifecycles.componentWillMount).to.have.been.calledOnce;
		expect(lifecycles.componentDidMount).to.not.have.been.called;
		expect(lifecycles.componentWillUnmount).to.not.have.been.called;

		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
		expect(lifecycles.componentWillMount).to.have.been.calledOnce;
		expect(lifecycles.componentDidMount).to.not.have.been.called;
		expect(lifecycles.componentWillUnmount).to.not.have.been.called;

		return resolve().then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`<div>Lifecycle</div>`);

			expect(lifecycles.componentWillMount).to.have.been.calledOnce;
			expect(lifecycles.componentDidMount).to.have.been.calledOnce;
			expect(lifecycles.componentWillUnmount).to.not.have.been.called;
		});
	});

	it('should properly call lifecycle methods and maintain state of a delayed suspending component', () => {
		/** @type {() => void} */
		let increment;

		/** @type {() => Promise<void>} */
		let resolve;
		let resolved = false;
		const promise = new Promise(_resolve => {
			resolve = () => {
				resolved = true;
				_resolve();
				return promise;
			};
		});

		class LifecycleSuspender extends Component {
			constructor(props) {
				super(props);
				this.state = { count: 0 };

				increment = () => this.setState(({ count }) => ({ count: count + 1 }));
			}
			render() {
				if (this.state.count == 2 && !resolved) {
					throw promise;
				}

				return (
					<Fragment>
						<p>Count: {this.state.count}</p>
					</Fragment>
				);
			}
			componentWillMount() {}
			componentDidMount() {}
			componentWillUnmount() {}
			componentDidUpdate() {}
		}

		const lifecycles = LifecycleSuspender.prototype;
		sinon.spy(lifecycles, 'componentWillMount');
		sinon.spy(lifecycles, 'componentDidMount');
		sinon.spy(lifecycles, 'componentDidUpdate');
		sinon.spy(lifecycles, 'componentWillUnmount');

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<LifecycleSuspender />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<p>Count: 0</p>`);
		expect(lifecycles.componentWillMount).to.have.been.calledOnce;
		expect(lifecycles.componentDidMount).to.have.been.calledOnce;
		expect(lifecycles.componentDidUpdate).to.not.have.been.called;
		expect(lifecycles.componentWillUnmount).to.not.have.been.called;

		increment();
		rerender();

		expect(scratch.innerHTML).to.eql(`<p>Count: 1</p>`);
		expect(lifecycles.componentWillMount).to.have.been.calledOnce;
		expect(lifecycles.componentDidMount).to.have.been.calledOnce;
		expect(lifecycles.componentDidUpdate).to.have.been.calledOnce;
		expect(lifecycles.componentWillUnmount).to.not.have.been.called;

		increment();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
		expect(lifecycles.componentWillMount).to.have.been.calledOnce;
		expect(lifecycles.componentDidMount).to.have.been.calledOnce;
		expect(lifecycles.componentDidUpdate).to.have.been.calledOnce;
		expect(lifecycles.componentWillUnmount).to.not.have.been.called;

		return resolve().then(() => {
			rerender();

			expect(scratch.innerHTML).to.eql(`<p>Count: 2</p>`);
			expect(lifecycles.componentWillMount).to.have.been.calledOnce;
			expect(lifecycles.componentDidMount).to.have.been.calledOnce;
			expect(lifecycles.componentDidUpdate).to.have.been.calledTwice;
			expect(lifecycles.componentWillUnmount).to.not.have.been.called;
		});
	});

	it('should not call lifecycle methods when a sibling suspends', () => {
		class LifecycleLogger extends Component {
			render() {
				return <div>Lifecycle</div>;
			}
			componentWillMount() {}
			componentDidMount() {}
			componentWillUnmount() {}
		}

		const lifecyles = LifecycleLogger.prototype;
		sinon.spy(lifecyles, 'componentWillMount');
		sinon.spy(lifecyles, 'componentDidMount');
		sinon.spy(lifecyles, 'componentWillUnmount');

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender />
				<LifecycleLogger />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<div>Suspense</div><div>Lifecycle</div>`);
		expect(lifecyles.componentWillMount).to.have.been.calledOnce;
		expect(lifecyles.componentDidMount).to.have.been.calledOnce;
		expect(lifecyles.componentWillUnmount).to.not.have.been.called;

		const [resolve] = suspend();

		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
		expect(lifecyles.componentWillMount).to.have.been.calledOnce;
		expect(lifecyles.componentDidMount).to.have.been.calledOnce;
		expect(lifecyles.componentWillUnmount).to.not.have.been.called;

		return resolve(() => <div>Suspense 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Suspense 2</div><div>Lifecycle</div>`
			);

			expect(lifecyles.componentWillMount).to.have.been.calledOnce;
			expect(lifecyles.componentDidMount).to.have.been.calledOnce;
			expect(lifecyles.componentWillUnmount).to.not.have.been.called;
		});
	});

	it("should call fallback's lifecycle methods when suspending", () => {
		class LifecycleLogger extends Component {
			render() {
				return <div>Lifecycle</div>;
			}
			componentWillMount() {}
			componentDidMount() {}
			componentWillUnmount() {}
		}

		const componentWillMount = sinon.spy(
			LifecycleLogger.prototype,
			'componentWillMount'
		);
		const componentDidMount = sinon.spy(
			LifecycleLogger.prototype,
			'componentDidMount'
		);
		const componentWillUnmount = sinon.spy(
			LifecycleLogger.prototype,
			'componentWillUnmount'
		);

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		render(
			<Suspense fallback={<LifecycleLogger />}>
				<Suspender />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<div>Suspense</div>`);
		expect(componentWillMount).to.not.have.been.called;
		expect(componentDidMount).to.not.have.been.called;
		expect(componentWillUnmount).to.not.have.been.called;

		const [resolve] = suspend();

		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Lifecycle</div>`);
		expect(componentWillMount).to.have.been.calledOnce;
		expect(componentDidMount).to.have.been.calledOnce;
		expect(componentWillUnmount).to.not.have.been.called;

		return resolve(() => <div>Suspense 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`<div>Suspense 2</div>`);

			expect(componentWillMount).to.have.been.calledOnce;
			expect(componentDidMount).to.have.been.calledOnce;
			expect(componentWillUnmount).to.have.been.calledOnce;
		});
	});

	it('should keep state of siblings when suspending', () => {
		/** @type {(state: { s: string }) => void} */
		let setState;
		class Stateful extends Component {
			constructor(props) {
				super(props);
				setState = this.setState.bind(this);
				this.state = { s: 'initial' };
			}
			render(props, state) {
				return <div>Stateful: {state.s}</div>;
			}
		}

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender />
				<Stateful />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: initial</div>`
		);

		setState({ s: 'first' });
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: first</div>`
		);

		const [resolve] = suspend();

		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(() => <div>Suspense 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Suspense 2</div><div>Stateful: first</div>`
			);
		});
	});

	it('should keep hook state of siblings when suspending', () => {
		/** @type {(state: string ) => void} */
		let setState;
		function Stateful() {
			const [state, _setState] = useState('initial');
			setState = _setState;

			return <div>Stateful: {state}</div>;
		}

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender />
				<Stateful />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: initial</div>`
		);

		setState('first');
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: first</div>`
		);

		const [resolve] = suspend();

		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(() => <div>Suspense 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Suspense 2</div><div>Stateful: first</div>`
			);
		});
	});

	it('should allow sibling to suspender to update state while suspending', () => {
		/** @type {(state: { s: string }) => void} */
		let setState;
		class Stateful extends Component {
			constructor(props) {
				super(props);
				setState = this.setState.bind(this);
				this.state = { s: 'initial' };
			}
			render(props, state) {
				return <div>Stateful: {state.s}</div>;
			}
		}

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender />
				<Stateful />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: initial</div>`
		);

		setState({ s: 'first' });
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: first</div>`
		);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		setState({ s: 'second' });
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(() => <div>Suspense 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Suspense 2</div><div>Stateful: second</div>`
			);
		});
	});

	it('should allow sibling to suspender to update hook state while suspending', () => {
		/** @type {(state: string) => void} */
		let setState;
		function Stateful() {
			const [state, _setState] = useState('initial');
			setState = _setState;
			return <div>Stateful: {state}</div>;
		}

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender />
				<Stateful />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: initial</div>`
		);

		setState('first');
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: first</div>`
		);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		setState('second');
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(() => <div>Suspense 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Suspense 2</div><div>Stateful: second</div>`
			);
		});
	});

	it('should allow siblings of Suspense to update state while suspending', () => {
		/** @type {(state: { s: string }) => void} */
		let setState;
		class Stateful extends Component {
			constructor(props) {
				super(props);
				setState = this.setState.bind(this);
				this.state = { s: 'initial' };
			}
			render(props, state) {
				return <div>Stateful: {state.s}</div>;
			}
		}

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		render(
			<Fragment>
				<Suspense fallback={<div>Suspended...</div>}>
					<Suspender />
				</Suspense>
				<Stateful />
			</Fragment>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: initial</div>`
		);

		setState({ s: 'first' });
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Stateful: first</div>`
		);

		const [resolve] = suspend();

		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div><div>Stateful: first</div>`
		);

		setState({ s: 'second' });
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div><div>Stateful: second</div>`
		);

		return resolve(() => <div>Suspense 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Suspense 2</div><div>Stateful: second</div>`
			);
		});
	});

	it('should suspend with custom error boundary', () => {
		const [Suspender, suspend] = createSuspender(() => (
			<div>within error boundary</div>
		));

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<Suspender />
				</Catcher>
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<div>within error boundary</div>`);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(() => <div>within error boundary 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`<div>within error boundary 2</div>`);
		});
	});

	it('should allow multiple sibling children to suspend', () => {
		const [Suspender1, suspend1] = createSuspender(() => (
			<div>Hello first</div>
		));
		const [Suspender2, suspend2] = createSuspender(() => (
			<div>Hello second</div>
		));

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<Suspender1 />
					<Suspender2 />
				</Catcher>
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div>Hello first</div><div>Hello second</div>`
		);
		expect(Suspender1.prototype.render).to.have.been.calledOnce;
		expect(Suspender2.prototype.render).to.have.been.calledOnce;

		const [resolve1, _1, Lazy1] = suspend1();
		const [resolve2, _2, Lazy2] = suspend2();
		expect(Lazy1).not.to.have.been.called;
		expect(Lazy2).not.to.have.been.called;

		rerender();

		// Lazy is only called once cuz vnode equality prevents re-rendering for the
		// <Catcher /> component's children
		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
		expect(Lazy1).to.have.been.calledOnce;
		expect(Lazy2).to.have.been.calledOnce;

		return (
			// Resolve the first Suspender
			resolve1(() => <div>Hello first 2</div>)
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
					expect(Lazy1).to.have.been.calledOnce;
					expect(Lazy2).to.have.been.calledOnce;
				})
				// Resolve the second Suspender
				.then(() => resolve2(() => <div>Hello second 2</div>))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>Hello first 2</div><div>Hello second 2</div>`
					);
					expect(Lazy1).to.have.been.calledTwice;
					expect(Lazy2).to.have.been.calledTwice;
				})
		);
	});

	it('should call multiple nested sibling suspending components render in one go', () => {
		const [Suspender1, suspend1] = createSuspender(() => (
			<div>Hello first</div>
		));
		const [Suspender2, suspend2] = createSuspender(() => (
			<div>Hello second</div>
		));

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<Suspender1 />
					<div>
						<Suspender2 />
					</div>
				</Catcher>
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div>Hello first</div><div><div>Hello second</div></div>`
		);
		expect(Suspender1.prototype.render).to.have.been.calledOnce;
		expect(Suspender2.prototype.render).to.have.been.calledOnce;

		const [resolve1, _1, Lazy1] = suspend1();
		const [resolve2, _2, Lazy2] = suspend2();
		expect(Lazy1).not.to.have.been.called;
		expect(Lazy2).not.to.have.been.called;

		rerender();

		// Lazy is only called once cuz vnode equality prevents re-rendering for the
		// <Catcher /> component's children
		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
		expect(Lazy1).to.have.been.calledOnce;
		expect(Lazy2).to.have.been.calledOnce;

		// Resolve first suspender
		return (
			resolve1(() => <div>Hello first 2</div>)
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);
					expect(Lazy1).to.have.been.calledOnce;
					expect(Lazy2).to.have.been.calledOnce;
				})
				// Resolve second suspender
				.then(() => resolve2(() => <div>Hello second 2</div>))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>Hello first 2</div><div><div>Hello second 2</div></div>`
					);
					expect(Lazy1).to.have.been.calledTwice;
					expect(Lazy2).to.have.been.calledTwice;
				})
		);
	});

	it('should support text directly under Suspense', () => {
		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				Text
				{/* Adding a <div> here will make things work... */}
				<Suspender />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`Text<div>Hello</div>`);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(() => <div>Hello 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`Text<div>Hello 2</div>`);
		});
	});

	it('should support to change DOM tag directly under suspense', () => {
		/** @type {(state: {tag: string}) => void} */
		let setState;
		class StatefulComp extends Component {
			constructor(props) {
				super(props);
				setState = this.setState.bind(this);
				this.state = {
					tag: props.defaultTag
				};
			}
			render(props, { tag: Tag }) {
				return <Tag>Stateful</Tag>;
			}
		}

		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<StatefulComp defaultTag="div" />
				<Suspender />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<div>Stateful</div><div>Hello</div>`);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		setState({ tag: 'article' });

		return resolve(() => <div>Hello 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<article>Stateful</article><div>Hello 2</div>`
			);
		});
	});

	it('should only suspend the most inner Suspend', () => {
		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		render(
			<Suspense fallback={<div>Suspended... 1</div>}>
				Not suspended...
				<Suspense fallback={<div>Suspended... 2</div>}>
					<Catcher>
						<Suspender />
					</Catcher>
				</Suspense>
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`Not suspended...<div>Hello</div>`);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(
			`Not suspended...<div>Suspended... 2</div>`
		);

		return resolve(() => <div>Hello 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`Not suspended...<div>Hello 2</div>`);
		});
	});

	it('should throw when missing Suspense', () => {
		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		render(
			<Catcher>
				<Suspender />
			</Catcher>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.eql(`<div>Hello</div>`);

		suspend();
		rerender();
		expect(scratch.innerHTML).to.eql(`<div>Catcher did catch: {Promise}</div>`);
	});

	it("should throw when lazy's loader throws", () => {
		const [ThrowingLazy, _, reject] = createLazy();

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<ThrowingLazy />
				</Catcher>
			</Suspense>,
			scratch
		);
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return reject(new Error("Thrown in lazy's loader...")).then(
			() => {
				expect.fail('Suspended promises resolved instead of rejected.');
			},
			() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Catcher did catch: Thrown in lazy's loader...</div>`
				);
			}
		);
	});

	it('should support null fallback', () => {
		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		render(
			<div id="wrapper">
				<Suspense fallback={null}>
					<div id="inner">
						<Suspender />
					</div>
				</Suspense>
			</div>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			`<div id="wrapper"><div id="inner"><div>Hello</div></div></div>`
		);

		const [resolve] = suspend();
		rerender();
		expect(scratch.innerHTML).to.equal(`<div id="wrapper"></div>`);

		return resolve(() => <div>Hello2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(
				`<div id="wrapper"><div id="inner"><div>Hello2</div></div></div>`
			);
		});
	});

	it('should support suspending multiple times', () => {
		const [Suspender, suspend] = createSuspender(() => (
			<div>initial render</div>
		));
		const Loading = () => <div>Suspended...</div>;

		render(
			<Suspense fallback={<Loading />}>
				<Suspender />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<div>initial render</div>`);

		let [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		return resolve(() => <div>Hello1</div>)
			.then(() => {
				// Rerender promise resolution
				rerender();
				expect(scratch.innerHTML).to.eql(`<div>Hello1</div>`);

				// suspend again
				[resolve] = suspend();
				rerender();

				expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

				return resolve(() => <div>Hello2</div>);
			})
			.then(() => {
				// Rerender promise resolution
				rerender();
				expect(scratch.innerHTML).to.eql(`<div>Hello2</div>`);
			});
	});

	it("should correctly render when a suspended component's child also suspends", () => {
		const [Suspender1, suspend1] = createSuspender(() => <div>Hello1</div>);
		const [LazyChild, resolveChild] = createLazy();

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender1 />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.equal(`<div>Hello1</div>`);

		let [resolve1] = suspend1();
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

		return resolve1(() => <LazyChild />)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

				return resolveChild(() => <div>All done!</div>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal('<div>All done!</div>');
			});
	});

	it('should correctly render nested Suspense components', () => {
		// Inspired by the nested-suspense demo from #1865
		// TODO: Explore writing a test that varies the loading orders

		const [Lazy1, resolve1] = createLazy();
		const [Lazy2, resolve2] = createLazy();
		const [Lazy3, resolve3] = createLazy();

		const Loading = () => <div>Suspended...</div>;
		const loadingHtml = `<div>Suspended...</div>`;

		render(
			<Suspense fallback={<Loading />}>
				<Lazy1 />
				<div>
					<Suspense fallback={<Loading />}>
						<Lazy2 />
					</Suspense>
					<Lazy3 />
				</div>
				<b>4</b>
			</Suspense>,
			scratch
		);
		rerender(); // Rerender with the fallback HTML

		expect(scratch.innerHTML).to.equal(loadingHtml);

		return resolve1(() => <b>1</b>)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(loadingHtml);

				return resolve3(() => <b>3</b>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					`<b>1</b><div>${loadingHtml}<b>3</b></div><b>4</b>`
				);

				return resolve2(() => <b>2</b>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					`<b>1</b><div><b>2</b><b>3</b></div><b>4</b>`
				);
			});
	});

	it.skip('should correctly render nested Suspense components without intermediate DOM #2747', () => {
		const [ProfileDetails, resolveDetails] = createLazy();
		const [ProfileTimeline, resolveTimeline] = createLazy();

		function ProfilePage() {
			return (
				<Suspense fallback={<h1>Loading profile...</h1>}>
					<ProfileDetails />
					<Suspense fallback={<h2>Loading posts...</h2>}>
						<ProfileTimeline />
					</Suspense>
				</Suspense>
			);
		}

		render(<ProfilePage />, scratch);
		rerender(); // Render fallback

		expect(scratch.innerHTML).to.equal('<h1>Loading profile...</h1>');

		return resolveDetails(() => <h1>Ringo Starr</h1>)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					'<h1>Ringo Starr</h1><h2>Loading posts...</h2>'
				);

				return resolveTimeline(() => <p>Timeline details</p>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					'<h1>Ringo Starr</h1><p>Timeline details</p>'
				);
			});
	});

	it('should correctly render Suspense components inside Fragments', () => {
		// Issue #2106.

		const [Lazy1, resolve1] = createLazy();
		const [Lazy2, resolve2] = createLazy();
		const [Lazy3, resolve3] = createLazy();

		const Loading = () => <div>Suspended...</div>;
		const loadingHtml = `<div>Suspended...</div>`;

		render(
			<Fragment>
				<Suspense fallback={<Loading />}>
					<Lazy1 />
				</Suspense>
				<Fragment>
					<Suspense fallback={<Loading />}>
						<Lazy2 />
					</Suspense>
				</Fragment>
				<Suspense fallback={<Loading />}>
					<Lazy3 />
				</Suspense>
			</Fragment>,
			scratch
		);

		rerender();
		expect(scratch.innerHTML).to.eql(
			`${loadingHtml}${loadingHtml}${loadingHtml}`
		);

		return resolve2(() => <span>2</span>)
			.then(() => {
				return resolve1(() => <span>1</span>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<span>1</span><span>2</span>${loadingHtml}`
				);
				return resolve3(() => <span>3</span>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<span>1</span><span>2</span><span>3</span>`
				);
			});
	});

	it('should not render any of the children if one child suspends', () => {
		const [Lazy, resolve] = createLazy();

		const Loading = () => <div>Suspended...</div>;
		const loadingHtml = `<div>Suspended...</div>`;

		render(
			<Suspense fallback={<Loading />}>
				<Lazy />
				<div>World</div>
			</Suspense>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.eql(loadingHtml);

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(`<div>Hello</div><div>World</div>`);
		});
	});

	it('should render correctly when multiple children suspend with the same promise', () => {
		/** @type {() => Promise<void>} */
		let resolve;
		let resolved = false;
		const promise = new Promise(_resolve => {
			resolve = () => {
				resolved = true;
				_resolve();
				return promise;
			};
		});

		const Child = props => {
			if (!resolved) {
				throw promise;
			}
			return props.children;
		};

		const Loading = () => <div>Suspended...</div>;
		const loadingHtml = `<div>Suspended...</div>`;

		render(
			<Suspense fallback={<Loading />}>
				<Child>
					<div>A</div>
				</Child>
				<Child>
					<div>B</div>
				</Child>
			</Suspense>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.eql(loadingHtml);

		return resolve().then(() => {
			resolved = true;
			rerender();
			expect(scratch.innerHTML).to.equal(`<div>A</div><div>B</div>`);
		});
	});

	it('should un-suspend when suspender unmounts', () => {
		const [Suspender, suspend] = createSuspender(() => <div>Suspender</div>);

		/** @type {() => void} */
		let hide;

		class Conditional extends Component {
			constructor(props) {
				super(props);
				this.state = { show: true };

				hide = () => {
					this.setState({ show: false });
				};
			}

			render(props, { show }) {
				return (
					<div>
						conditional {show ? 'show' : 'hide'}
						{show && <Suspender />}
					</div>
				);
			}
		}

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Conditional />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div>conditional show<div>Suspender</div></div>`
		);
		expect(Suspender.prototype.render).to.have.been.calledOnce;

		suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		hide();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>conditional hide</div>`);
	});

	it('should allow suspended multiple times', async () => {
		const [Suspender1, suspend1] = createSuspender(() => (
			<div>Suspender 1</div>
		));
		const [Suspender2, suspend2] = createSuspender(() => (
			<div>Suspender 2</div>
		));

		/** @type {() => void} */
		let hide;

		class Conditional extends Component {
			constructor(props) {
				super(props);
				this.state = { show: true };

				hide = () => {
					this.setState({ show: false });
				};
			}

			render(props, { show }) {
				return (
					<div>
						conditional {show ? 'show' : 'hide'}
						{show && (
							<Suspense fallback="Suspended">
								<Suspender1 />
								<Suspender2 />
							</Suspense>
						)}
					</div>
				);
			}
		}

		render(<Conditional />, scratch);
		expect(scratch.innerHTML).to.eql(
			'<div>conditional show<div>Suspender 1</div><div>Suspender 2</div></div>'
		);

		let resolve = suspend1()[0];
		rerender();
		expect(scratch.innerHTML).to.eql('<div>conditional showSuspended</div>');

		await resolve(() => <div>Done 1</div>);
		rerender();
		expect(scratch.innerHTML).to.eql(
			'<div>conditional show<div>Done 1</div><div>Suspender 2</div></div>'
		);

		resolve = suspend2()[0];
		rerender();
		expect(scratch.innerHTML).to.eql('<div>conditional showSuspended</div>');

		await resolve(() => <div>Done 2</div>);
		rerender();
		expect(scratch.innerHTML).to.eql(
			'<div>conditional show<div>Done 1</div><div>Done 2</div></div>'
		);

		hide();
		rerender();
		expect(scratch.innerHTML).to.eql('<div>conditional hide</div>');
	});

	it('should allow same component to be suspended multiple times', async () => {
		const cache = { '1': true };
		function Lazy({ value }) {
			if (!cache[value]) {
				throw new Promise(resolve => {
					cache[value] = resolve;
				});
			}
			return <div>{`Lazy ${value}`}</div>;
		}

		/** @type {() => void} */
		let hide;
		/** @type {(value: string) => void} */
		let setValue;

		class Conditional extends Component {
			constructor(props) {
				super(props);
				this.state = { show: true, value: '1' };

				hide = () => {
					this.setState({ show: false });
				};
				setValue = value => {
					this.setState({ value });
				};
			}

			render(props, { show, value }) {
				return (
					<div>
						conditional {show ? 'show' : 'hide'}
						{show && (
							<Suspense fallback="Suspended">
								<Lazy value={value} />
							</Suspense>
						)}
					</div>
				);
			}
		}

		render(<Conditional />, scratch);
		expect(scratch.innerHTML).to.eql(
			'<div>conditional show<div>Lazy 1</div></div>'
		);

		setValue('2');
		rerender();

		expect(scratch.innerHTML).to.eql('<div>conditional showSuspended</div>');

		await cache[2]();
		rerender();

		expect(scratch.innerHTML).to.eql(
			'<div>conditional show<div>Lazy 2</div></div>'
		);

		setValue('3');
		rerender();

		expect(scratch.innerHTML).to.eql('<div>conditional showSuspended</div>');

		await cache[3]();
		rerender();
		expect(scratch.innerHTML).to.eql(
			'<div>conditional show<div>Lazy 3</div></div>'
		);

		hide();
		rerender();
		expect(scratch.innerHTML).to.eql('<div>conditional hide</div>');
	});

	it('should allow resolve suspense promise after unmounts', async () => {
		const [Suspender, suspend] = createSuspender(() => <div>Suspender</div>);

		/** @type {() => void} */
		let hide;

		class Conditional extends Component {
			constructor(props) {
				super(props);
				this.state = { show: true };

				hide = () => {
					this.setState({ show: false });
				};
			}

			render(props, { show }) {
				return (
					<div>
						conditional {show ? 'show' : 'hide'}
						{show && (
							<Suspense fallback="Suspended">
								<Suspender />
							</Suspense>
						)}
					</div>
				);
			}
		}

		render(<Conditional />, scratch);
		expect(scratch.innerHTML).to.eql(
			'<div>conditional show<div>Suspender</div></div>'
		);

		let resolve = suspend()[0];
		rerender();
		expect(scratch.innerHTML).to.eql('<div>conditional showSuspended</div>');

		hide();
		rerender();
		expect(scratch.innerHTML).to.eql('<div>conditional hide</div>');

		await resolve(() => <div>Done</div>);
		rerender();
		expect(scratch.innerHTML).to.eql('<div>conditional hide</div>');
	});

	it('should support updating parent of suspender state while suspended', async () => {
		const [Suspender, suspend] = createSuspender(() => <div>Suspender</div>);

		/** @type {() => void} */
		let increment;

		class Updater extends Component {
			constructor(props) {
				super(props);
				this.state = { i: 0 };

				increment = () => {
					this.setState(({ i }) => ({ i: i + 1 }));
				};
			}

			render(props, { i }) {
				return (
					<div>
						i: {i}
						<Suspender />
					</div>
				);
			}
		}

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Updater />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<div>i: 0<div>Suspender</div></div>`);
		expect(Suspender.prototype.render).to.have.been.calledOnce;

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		increment();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		await resolve(() => <div>Resolved</div>);
		rerender();

		expect(scratch.innerHTML).to.equal(`<div>i: 1<div>Resolved</div></div>`);

		increment();
		rerender();

		expect(scratch.innerHTML).to.equal(`<div>i: 2<div>Resolved</div></div>`);
	});

	it('should support updating parent of suspender hook state while suspended', async () => {
		const [Suspender, suspend] = createSuspender(() => <div>Suspender</div>);

		/** @type {() => void} */
		let increment;
		function Updater() {
			const [i, setState] = useState(0);
			increment = () => setState(i => i + 1);
			return (
				<div>
					i: {i}
					<Suspender />
				</div>
			);
		}

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Updater />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<div>i: 0<div>Suspender</div></div>`);
		expect(Suspender.prototype.render).to.have.been.calledOnce;

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		increment();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		await resolve(() => <div>Resolved</div>);
		rerender();

		expect(scratch.innerHTML).to.equal(`<div>i: 1<div>Resolved</div></div>`);

		increment();
		rerender();

		expect(scratch.innerHTML).to.equal(`<div>i: 2<div>Resolved</div></div>`);
	});

	it('should call componentWillUnmount on a suspended component', () => {
		// eslint-disable-next-line react/require-render-return
		class Suspender extends Component {
			componentWillUnmount() {}
			/** @returns {import('../../src/internal').ComponentChildren} */
			render() {
				throw new Promise(() => {});
			}
		}

		const cWUSpy = sinon.spy(Suspender.prototype, 'componentWillUnmount');

		/** @type {() => void} */
		let hide;

		let suspender = null;
		let suspenderRef = s => {
			// skip null values as we want to keep the ref even after unmount
			if (s) {
				suspender = s;
			}
		};

		class Conditional extends Component {
			constructor(props) {
				super(props);
				this.state = { show: true };

				hide = () => {
					this.setState({ show: false });
				};
			}

			render(props, { show }) {
				return (
					<div>
						conditional {show ? 'show' : 'hide'}
						{show && <Suspender ref={suspenderRef} />}
					</div>
				);
			}
		}

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Conditional />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`<div>conditional show</div>`);
		expect(cWUSpy).to.not.have.been.called;

		hide();
		rerender();

		expect(cWUSpy).to.have.been.calledOnce;
		expect(suspender).not.to.be.undefined;
		expect(suspender).not.to.be.null;
		expect(cWUSpy.getCall(0).thisValue).to.eql(suspender);
		expect(scratch.innerHTML).to.eql(`<div>conditional hide</div>`);
	});

	it('should support sCU=false when un-suspending', () => {
		// See #2176 #2125
		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				Text
				{/*
					Adding a <div> here will make things work so don't add one here to
					effectively repro the original issue...
				*/}
				<Suspender />
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(`Text<div>Hello</div>`);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(`<div>Suspended...</div>`);

		Suspender.prototype.shouldComponentUpdate = () => false;

		return resolve(() => <div>Hello 2</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`Text<div>Hello 2</div>`);
		});
	});

	// TODO: Revisit later. Consider using an "options.commit" plugin to detect
	// when a suspended component has rerendered and trigger a rerender on the
	// parent Suspense
	it.skip('should allow suspended children to update', () => {
		const log = [];
		class Logger extends Component {
			constructor(props) {
				super(props);
				log.push('construct');
			}

			render({ children }) {
				log.push('render');
				return children;
			}
		}

		/** @type {{ unsuspend(): void }} */
		let suspender;
		class Suspender extends Component {
			constructor(props) {
				super(props);
				this.state = { promise: new Promise(() => {}) };
				suspender = this;
			}

			unsuspend() {
				this.setState({ promise: null });
			}

			render() {
				if (this.state.promise) {
					throw this.state.promise;
				}

				return <div>Suspender un-suspended</div>;
			}
		}

		render(
			<section>
				<Suspense fallback={<div>fallback</div>}>
					<Suspender />
					<Logger />
				</Suspense>
			</section>,
			scratch
		);

		expect(log).to.eql(['construct', 'render']);
		expect(scratch.innerHTML).to.eql('<section></section>');

		// this rerender is needed because of Suspense issuing a forceUpdate itself
		rerender();
		expect(scratch.innerHTML).to.eql('<section><div>fallback</div></section>');

		suspender.unsuspend();

		rerender();

		expect(log).to.eql(['construct', 'render', 'render']);
		expect(scratch.innerHTML).to.eql(
			'<section><div>Suspender un-suspended</div></section>'
		);
	});

	// TODO: Revisit later. Consider using an "options.commit" plugin to detect
	// when a suspended component has rerendered and trigger a rerender on the
	// parent Suspense
	it.skip('should allow multiple suspended children to update', () => {
		/** @returns {[(content: any) => void, import('preact/src/index').ComponentClass]} */
		function createSuspender() {
			let suspender;
			class Suspender extends Component {
				constructor(props) {
					super(props);
					this.state = { promise: new Promise(() => {}) };
					suspender = this;
				}

				unsuspend(content) {
					this.setState({ promise: null, content });
				}

				render() {
					if (this.state.promise) {
						throw this.state.promise;
					}

					return this.state.content;
				}
			}
			return [content => suspender.unsuspend(content), Suspender];
		}

		const [unsuspender1, Suspender1] = createSuspender();
		const [unsuspender2, Suspender2] = createSuspender();

		render(
			<section>
				<Suspense fallback={<div>fallback</div>}>
					<Suspender1 />
					<div>
						<Suspender2 />
					</div>
				</Suspense>
			</section>,
			scratch
		);

		expect(scratch.innerHTML).to.eql('<section><div></div></section>');

		// this rerender is needed because of Suspense issuing a forceUpdate itself
		rerender();
		expect(scratch.innerHTML).to.eql('<section><div>fallback</div></section>');

		unsuspender1(
			<>
				<div>Suspender un-suspended 1</div>
				<div>Suspender un-suspended 2</div>
			</>
		);

		rerender();
		expect(scratch.innerHTML).to.eql('<section><div>fallback</div></section>');

		unsuspender2(<div>Suspender 2</div>);

		rerender();
		expect(scratch.innerHTML).to.eql(
			'<section><div>Suspender un-suspended 1</div><div>Suspender un-suspended 2</div><div><div>Suspender 2</div></div></section>'
		);
	});

	// TODO: Revisit later. Consider using an "options.commit" plugin to detect
	// when a suspended component has rerendered and trigger a rerender on the
	// parent Suspense
	it.skip('should allow suspended children children to update', () => {
		function Suspender({ promise, content }) {
			if (promise) {
				throw promise;
			}
			return content;
		}

		/** @type {Component} */
		let parent;
		class Parent extends Component {
			constructor(props) {
				super(props);
				this.state = { promise: new Promise(() => {}), condition: true };
				parent = this;
			}

			render() {
				const { condition, promise, content } = this.state;
				if (condition) {
					return <Suspender promise={promise} content={content} />;
				}
				return <div>Parent</div>;
			}
		}

		render(
			<section>
				<Suspense fallback={<div>fallback</div>}>
					<Parent />
				</Suspense>
			</section>,
			scratch
		);

		expect(scratch.innerHTML).to.eql('<section></section>');

		// this rerender is needed because of Suspense issuing a forceUpdate itself
		rerender();
		expect(scratch.innerHTML).to.eql('<section><div>fallback</div></section>');

		// hide the <Suspender /> thus unsuspends
		parent.setState({ condition: false });

		rerender();
		expect(scratch.innerHTML).to.eql('<section><div>Parent</div></section>');

		// show the <Suspender /> thus re-suspends
		parent.setState({ condition: true });
		rerender();

		expect(scratch.innerHTML).to.eql('<section><div>fallback</div></section>');

		// update state so that <Suspender /> no longer suspends
		parent.setState({ promise: null, content: <div>Content</div> });
		rerender();

		expect(scratch.innerHTML).to.eql('<section><div>Content</div></section>');

		// hide the <Suspender /> again
		parent.setState({ condition: false });
		rerender();

		expect(scratch.innerHTML).to.eql('<section><div>Parent</div></section>');
	});

	it('should render delayed lazy components through components using shouldComponentUpdate', () => {
		const [Suspender1, suspend1] = createSuspender(() => <i>1</i>);
		const [Suspender2, suspend2] = createSuspender(() => <i>2</i>);

		class Blocker extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render(props) {
				return (
					<b>
						<i>a</i>
						{props.children}
						<i>d</i>
					</b>
				);
			}
		}

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Blocker>
					<Suspender1 />
					<Suspender2 />
				</Blocker>
			</Suspense>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<b><i>a</i><i>1</i><i>2</i><i>d</i></b>'
		);

		const [resolve1] = suspend1();
		const [resolve2] = suspend2();
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

		return resolve1(() => <i>b</i>)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

				return resolve2(() => <i>c</i>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					'<b><i>a</i><i>b</i><i>c</i><i>d</i></b>'
				);
			});
	});

	it('should render initially lazy components through components using shouldComponentUpdate', () => {
		const [Lazy1, resolve1] = createLazy();
		const [Lazy2, resolve2] = createLazy();

		class Blocker extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render(props) {
				return (
					<b>
						<i>a</i>
						{props.children}
						<i>d</i>
					</b>
				);
			}
		}

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<Blocker>
					<Lazy1 />
					<Lazy2 />
				</Blocker>
			</Suspense>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

		return resolve1(() => <i>b</i>)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

				return resolve2(() => <i>c</i>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					'<b><i>a</i><i>b</i><i>c</i><i>d</i></b>'
				);
			});
	});

	it('should render delayed lazy components through nested DOM and components using shouldComponentUpdate', () => {
		const [Suspender1, suspend1] = createSuspender(() => <i>1</i>);
		const [Suspender2, suspend2] = createSuspender(() => <i>2</i>);

		class Blocker extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render(props) {
				return (
					<b>
						<i>a</i>
						{props.children}
						<i>d</i>
					</b>
				);
			}
		}

		render(
			<Suspense fallback={<div>Suspended...</div>}>
				<div>
					<Fragment>
						<Blocker>
							<Suspender1 />
							<Suspender2 />
						</Blocker>
					</Fragment>
				</div>
			</Suspense>,
			scratch
		);
		expect(scratch.innerHTML).to.equal(
			'<div><b><i>a</i><i>1</i><i>2</i><i>d</i></b></div>'
		);

		const [resolve1] = suspend1();
		const [resolve2] = suspend2();
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

		return resolve1(() => <i>b</i>)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal('<div>Suspended...</div>');

				return resolve2(() => <i>c</i>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					'<div><b><i>a</i><i>b</i><i>c</i><i>d</i></b></div>'
				);
			});
	});

	it('should render initially lazy components through createContext', () => {
		const ctx = createContext(null);
		const [Lazy, resolve] = createLazy();

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<ctx.Provider value="123">
					<ctx.Consumer>{value => <Lazy value={value} />}</ctx.Consumer>
				</ctx.Provider>
			</Suspense>
		);

		render(suspense, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal(`<div>Suspended...</div>`);

		return resolve(props => <div>{props.value}</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`<div>123</div>`);
		});
	});

	it('should render delayed lazy components through createContext', () => {
		const ctx = createContext(null);
		const [Suspender, suspend] = createSuspender(({ value }) => (
			<span>{value}</span>
		));

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<ctx.Provider value="123">
					<ctx.Consumer>{value => <Suspender value={value} />}</ctx.Consumer>
				</ctx.Provider>
			</Suspense>
		);

		render(suspense, scratch);
		expect(scratch.innerHTML).to.equal('<span>123</span>');

		const [resolve] = suspend();
		rerender();
		expect(scratch.innerHTML).to.equal(`<div>Suspended...</div>`);

		return resolve(props => <div>{props.value}</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(`<div>123</div>`);
		});
	});

	it('should support suspending around Fragments', () => {
		const [Suspender, suspend] = createSuspender(() => <div>initial</div>);

		function App() {
			return (
				<Fragment>
					<Fragment>
						<div>0</div>
					</Fragment>
					<Suspense fallback={<div>Suspended...</div>}>
						<Fragment>
							<div>1</div>
						</Fragment>
						<Suspender />
						<Fragment>
							<div>2</div>
						</Fragment>
					</Suspense>
					<Fragment>
						<div>3</div>
					</Fragment>
				</Fragment>
			);
		}

		render(<App />, scratch);
		expect(scratch.innerHTML).to.equal(
			[div(0), div(1), div('initial'), div(2), div(3)].join('')
		);

		const [resolve] = suspend();
		rerender();
		expect(scratch.innerHTML).to.equal(
			[div(0), div('Suspended...'), div(3)].join('')
		);

		return resolve(() => (
			<Fragment>
				<div>resolved A</div>
				<div>resolved B</div>
			</Fragment>
		)).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(
				[
					div(0),
					div(1),
					div('resolved A'),
					div('resolved B'),
					div(2),
					div(3)
				].join('')
			);
		});
	});

	it('should support mounting Suspense after initial render', () => {
		const [Lazy, resolve] = createLazy();

		function App({ mount }) {
			return (
				<Fragment>
					<Fragment>
						<div>0</div>
					</Fragment>
					{mount && (
						<Suspense fallback={<div>Suspended...</div>}>
							<Fragment>
								<div>1</div>
							</Fragment>
							<Lazy />
							<Fragment>
								<div>2</div>
							</Fragment>
						</Suspense>
					)}
					<Fragment>
						<div>3</div>
					</Fragment>
				</Fragment>
			);
		}

		render(<App mount={false} />, scratch);
		expect(scratch.innerHTML).to.equal([div(0), div(3)].join(''));

		render(<App mount />, scratch); // Render suspense
		rerender(); // Render fallback
		expect(scratch.innerHTML).to.equal(
			[div(0), div('Suspended...'), div(3)].join('')
		);

		return resolve(() => (
			<Fragment>
				<div>resolved A</div>
				<div>resolved B</div>
			</Fragment>
		)).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(
				[
					div(0),
					div(1),
					div('resolved A'),
					div('resolved B'),
					div(2),
					div(3)
				].join('')
			);
		});
	});
});
