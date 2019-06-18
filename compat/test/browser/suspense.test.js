/*eslint-env browser, mocha */
/** @jsx h */
import { setupRerender } from 'preact/test-utils';
import { createElement as h, render, Component, Suspense, lazy, Fragment } from '../../src/index';
import { setupScratch, teardown } from '../../../test/_util/helpers';

// TODO:
// Add tests for
// * Remove dependency on suspense._component._suspensions
// * Fix TODO about improperly unmounting fallback and updating _dom pointers
// * Specify sibling to what (Suspense) in existing tests
// * maintaining state of sibling to suspender and suspense
// * updating state of sibling to suspender and suspense
// * Have different initial component and resolved component

/**
 * @typedef {import('../../../src').ComponentType} ComponentType
 * @typedef {[(c: ComponentType) => void, (error: Error) => void]} Resolvers
 * @param {ComponentType} DefaultComponent
 * @returns {[typeof Component, () => Resolvers]}
 */
function createSuspender(DefaultComponent) {
	// Test public api
	// Prefer not relying on internal VNode shape
	// Prefer not refs so refs can change and break without affecting unrelated tests
	// Prefer not using forceUpdate since it doesn't match what our user's will do/experience

	/** @type {(lazy: h.JSX.Element) => void} */
	let renderLazy;
	class Suspender extends Component {
		constructor(props, context) {
			super(props, context);
			this.state = { Lazy: null };

			renderLazy = Lazy => this.setState({ Lazy });
		}

		render(props, state) {
			return state.Lazy ? h(state.Lazy, {}) : h(DefaultComponent, {});
		}
	}

	sinon.spy(Suspender.prototype, 'render');

	/**
	 * @returns {Resolvers}
	 */
	function suspend() {

		/** @type {(c: ComponentType) => void} */
		let resolver, rejecter;
		const Lazy = lazy(() => new Promise((resolve, reject) => {
			resolver = c => resolve({ default: c });
			rejecter = reject;
		}));

		renderLazy(Lazy);
		return [c => resolver(c), e => rejecter(e)];
	}

	return [Suspender, suspend];
}

class Catcher extends Component {
	constructor(props) {
		super(props);
		this.state = { error: false };
	}

	componentDidCatch(e) {
		if (e.then) {
			this.setState({ error: { message: '{Promise}' } });
		}
		else {
			this.setState({ error: e });
		}
	}

	render(props, state) {
		return state.error ? <div>Catcher did catch: {state.error.message}</div> : props.children;
	}
}

describe('suspense', () => {
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should support lazy', () => {
		const LazyComp = () => <div>Hello from LazyComp</div>;

		/** @type {() => Promise<void>} */
		let resolve;
		const Lazy = lazy(() => {
			const p = new Promise((res) => {
				resolve = () => {
					res({ default: LazyComp });
					return p;
				};
			});

			return p;
		});

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Lazy />
			</Suspense>
		);

		render(suspense, scratch); // Render initial state
		rerender(); // Re-render with fallback cuz lazy threw

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		return resolve()
			.then(() => Promise.all(suspense._component._suspensions))
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Hello from LazyComp</div>`
				);
			});
	});

	it('should suspend when a promise is thrown', () => {
		class ClassWrapper extends Component {
			render(props) {
				return (
					<div id="class-wrapper">
						{props.children}
					</div>
				);
			}
		}

		const FuncWrapper = props => (
			<div id="func-wrapper">
				{props.children}
			</div>
		);

		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<ClassWrapper>
					<FuncWrapper>
						<Suspender />
					</FuncWrapper>
				</ClassWrapper>
			</Suspense>
		);

		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div id="class-wrapper"><div id="func-wrapper"><div>Hello</div></div></div>`
		);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		resolve(() => <div>Hello2</div>);

		return Promise.resolve().then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div id="class-wrapper"><div id="func-wrapper"><div>Hello2</div></div></div>`
			);
		});
	});

	it('should not call lifecycle methods when suspending', () => {
		class LifecycleLogger extends Component {
			render() {
				return <div>Lifecycle</div>;
			}
			componentWillMount() {}
			componentDidMount() {}
			componentWillUnmount() {}
		}

		const componentWillMount = sinon.spy(LifecycleLogger.prototype, 'componentWillMount');
		const componentDidMount = sinon.spy(LifecycleLogger.prototype, 'componentDidMount');
		const componentWillUnmount = sinon.spy(LifecycleLogger.prototype, 'componentWillUnmount');

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender />
				<LifecycleLogger />
			</Suspense>
		);

		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div><div>Lifecycle</div>`
		);
		expect(componentWillMount).to.have.been.calledOnce;
		expect(componentDidMount).to.have.been.calledOnce;
		expect(componentWillUnmount).to.not.have.been.called;

		const [resolve] = suspend();

		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);
		expect(componentWillMount).to.have.been.calledOnce;
		expect(componentDidMount).to.have.been.calledOnce;
		expect(componentWillUnmount).to.not.have.been.called;

		resolve(() => <div>Suspense</div>);
		return Promise.all(suspense._component._suspensions)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Suspense</div><div>Lifecycle</div>`
				);

				expect(componentWillMount).to.have.been.calledOnce;
				expect(componentDidMount).to.have.been.calledOnce;
				expect(componentWillUnmount).to.not.have.been.called;
			});
	});

	it('should call fallback\'s lifecycle methods when suspending', () => {
		class LifecycleLogger extends Component {
			render() {
				return <div>Lifecycle</div>;
			}
			componentWillMount() {}
			componentDidMount() {}
			componentWillUnmount() {}
		}

		const componentWillMount = sinon.spy(LifecycleLogger.prototype, 'componentWillMount');
		const componentDidMount = sinon.spy(LifecycleLogger.prototype, 'componentDidMount');
		const componentWillUnmount = sinon.spy(LifecycleLogger.prototype, 'componentWillUnmount');

		const [Suspender, suspend] = createSuspender(() => <div>Suspense</div>);

		const suspense = (
			<Suspense fallback={<LifecycleLogger />}>
				<Suspender />
			</Suspense>
		);

		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div>`
		);
		expect(componentWillMount).to.not.have.been.called;
		expect(componentDidMount).to.not.have.been.called;
		expect(componentWillUnmount).to.not.have.been.called;

		const [resolve] = suspend();

		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Lifecycle</div>`
		);
		expect(componentWillMount).to.have.been.calledOnce;
		expect(componentDidMount).to.have.been.calledOnce;
		expect(componentWillUnmount).to.not.have.been.called;

		resolve(() => <div>Suspense</div>);
		return Promise.all(suspense._component._suspensions)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Suspense</div>`
				);

				expect(componentWillMount).to.have.been.calledOnce;
				expect(componentDidMount).to.have.been.calledOnce;
				expect(componentWillUnmount).to.have.been.calledOnce;
			});
	});

	it('should keep state of children when suspending', () => {

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

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender />
				<Stateful />
			</Suspense>
		);

		render(suspense, scratch);

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
			`<div>Suspended...</div>`
		);

		resolve(() => <div>Suspense</div>);
		return Promise.all(suspense._component._suspensions)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Suspense</div><div>Stateful: first</div>`
				);
			});
	});

	it('should allow siblings to update state while suspending', () => {

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

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Suspender />
			</Suspense>
		);
		render(
			<Fragment>
				{/*
					TODO: Update Suspense to use this.state to manage it's children so that it can
					take advantage of the _dom pointer tracking that happens in `forceUpdate` to
					unmount fallback and properly mount the new content
			 	*/}
				<div>
					{suspense}
				</div>
				<Stateful />
			</Fragment>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`<div><div>Suspense</div></div><div>Stateful: initial</div>`
		);

		setState({ s: 'first' });
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div><div>Suspense</div></div><div>Stateful: first</div>`
		);

		const [resolve] = suspend();

		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div><div>Suspended...</div></div><div>Stateful: first</div>`
		);

		setState({ s: 'second' });
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div><div>Suspended...</div></div><div>Stateful: second</div>`
		);

		resolve(() => <div>Suspense</div>);
		return Promise.all(suspense._component._suspensions)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div><div>Suspense</div></div><div>Stateful: second</div>`
				);
			});
	});

	it('should suspend with custom error boundary', () => {
		const [Suspender, suspend] = createSuspender(() => <div>within error boundary</div>);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<Suspender />
				</Catcher>
			</Suspense>
		);

		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>within error boundary</div>`
		);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		resolve(() => <div>within error boundary</div>);
		return Promise.all(suspense._component._suspensions)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>within error boundary</div>`
				);
			});
	});

	it('should allow multiple children to suspend', () => {
		const [Suspender1, suspend1] = createSuspender(() => <div>Hello first</div>);
		const [Suspender2, suspend2] = createSuspender(() => <div>Hello second</div>);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<Suspender1 />
					<Suspender2 />
				</Catcher>
			</Suspense>
		);
		render(suspense, scratch);
		expect(scratch.innerHTML).to.eql(
			`<div>Hello first</div><div>Hello second</div>`
		);
		expect(Suspender1.prototype.render).to.have.been.calledOnce;
		expect(Suspender2.prototype.render).to.have.been.calledOnce;

		const [resolve1] = suspend1();
		const [resolve2] = suspend2();
		expect(Suspender1.prototype.render).to.have.been.calledOnce;
		expect(Suspender2.prototype.render).to.have.been.calledOnce;

		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);
		expect(Suspender1.prototype.render).to.have.been.calledTwice;
		expect(Suspender2.prototype.render).to.have.been.calledTwice;

		resolve1(() => <div>Hello first</div>);
		return Promise.resolve().then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);
			expect(Suspender1.prototype.render).to.have.been.calledTwice;
			expect(Suspender2.prototype.render).to.have.been.calledTwice;

			resolve2(() => <div>Hello second</div>);
			return Promise.all(suspense._component._suspensions).then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Hello first</div><div>Hello second</div>`
				);
				expect(Suspender1.prototype.render).to.have.been.calledThrice;
				expect(Suspender2.prototype.render).to.have.been.calledThrice;
			});
		});
	});

	it('should call multiple nested suspending components render in one go', () => {
		const [Suspender1, suspend1] = createSuspender(() => <div>Hello first</div>);
		const [Suspender2, suspend2] = createSuspender(() => <div>Hello second</div>);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<Suspender1 />
					<div>
						{/* TODO: Try to update such that this div is not needed */}
						<Suspender2 />
					</div>
				</Catcher>
			</Suspense>
		);
		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>Hello first</div><div><div>Hello second</div></div>`
		);
		expect(Suspender1.prototype.render).to.have.been.calledOnce;
		expect(Suspender2.prototype.render).to.have.been.calledOnce;

		const [resolve1] = suspend1();
		const [resolve2] = suspend2();
		expect(Suspender1.prototype.render).to.have.been.calledOnce;
		expect(Suspender2.prototype.render).to.have.been.calledOnce;

		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);
		expect(Suspender1.prototype.render).to.have.been.calledTwice;
		expect(Suspender2.prototype.render).to.have.been.calledTwice;
		expect(suspense._component._suspensions.length).to.eql(2);

		resolve1(() => <div>Hello first</div>);
		return Promise.resolve().then(() => {
			rerender();
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);
			expect(Suspender1.prototype.render).to.have.been.calledTwice;
			expect(Suspender2.prototype.render).to.have.been.calledTwice;

			resolve2(() => <div>Hello second</div>);
			return Promise.all(suspense._component._suspensions).then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Hello first</div><div><div>Hello second</div></div>`
				);
				expect(Suspender1.prototype.render).to.have.been.calledThrice;
				expect(Suspender2.prototype.render).to.have.been.calledThrice;
			});
		});
	});

	it('should support text directly under Suspense', () => {
		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				Text
				{/* Adding a <div> here will make things work... */}
				<Suspender />
			</Suspense>
		);
		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`Text<div>Hello</div>`
		);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		resolve(() => <div>Hello</div>);
		return Promise.all(suspense._component._suspensions)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`Text<div>Hello</div>`
				);
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
				return (
					<Tag>Stateful</Tag>
				);
			}
		}

		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<StatefulComp defaultTag="div" />
				<Suspender />
			</Suspense>
		);
		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>Stateful</div><div>Hello</div>`
		);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		setState({ tag: 'article' });

		resolve(() => <div>Hello</div>);
		return Promise.all(suspense._component._suspensions)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<article>Stateful</article><div>Hello</div>`
				);
			});
	});

	it('should only suspend the most inner Suspend', () => {
		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		const suspense = (
			<Suspense fallback={<div>Suspended... 2</div>}>
				<Catcher>
					<Suspender />
				</Catcher>
			</Suspense>
		);
		render(
			<Suspense fallback={<div>Suspended... 1</div>}>
				Not suspended...
				{suspense}
			</Suspense>,
			scratch
		);

		expect(scratch.innerHTML).to.eql(
			`Not suspended...<div>Hello</div>`
		);

		const [resolve] = suspend();
		rerender();

		expect(scratch.innerHTML).to.eql(
			`Not suspended...<div>Suspended... 2</div>`
		);

		resolve(() => <div>Hello</div>);
		return Promise.all(suspense._component._suspensions)
			.then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`Not suspended...<div>Hello</div>`
				);
			});
	});

	it('should throw when missing Suspense', () => {
		const [Suspender, suspend] = createSuspender(() => <div>Hello</div>);

		render(
			<Catcher>
				<Suspender />
			</Catcher>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Hello</div>`
		);

		suspend();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Catcher did catch: {Promise}</div>`
		);
	});

	it('should throw when lazy\'s loader throws', () => {

		/** @type {() => void} */
		let reject;
		const ThrowingLazy = lazy(() => {
			const prom = new Promise((res, rej) => {
				reject = () => rej(new Error('Thrown in lazy\'s loader...'));
			});

			return prom;
		});

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					<ThrowingLazy />
				</Catcher>
			</Suspense>
		);
		render(suspense, scratch);
		rerender();

		expect(scratch.innerHTML).to.eql(
			`<div>Suspended...</div>`
		);

		reject();
		return Promise.all(suspense._component._suspensions).then(
			() => { expect.fail('Suspended promises resolved instead of rejected.'); },
			() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Catcher did catch: Thrown in lazy's loader...</div>`
				);
			});
	});
});
