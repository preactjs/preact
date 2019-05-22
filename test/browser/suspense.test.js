/*eslint-env browser, mocha */
/** @jsx h */
import { setupRerender } from 'preact/test-utils';
import { createElement as h, render, Component, Suspense, lazy, Fragment } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';
import { enqueueRender } from '../../src/component';

class LazyComp extends Component {
	render() {
		return <div>Hello from LazyComp</div>;
	}
}

class Suspendable extends Component {
	constructor(props) {
		super(props);
		this.spies = {};
		['render'].forEach((method) => {
			this.spies[method] = sinon.spy(this, method);
		});
	}
	suspend(update) {
		this.promise = new Promise((res, rej) => {
			this.resolve = () => {
				const promise = this.promise;
				this.promise = null;
				res();
				return promise;
			};
			this.reject = (err) => {
				const promise = this.promise;
				this.promise = null;
				rej(err);
				return promise;
			};
		});

		if (update === true || update === undefined) {
			this.forceUpdate();
		}
	}

	render(props) {
		if (this.promise) {
			throw this.promise;
		}

		return props.render(props);
	}
}

class Catcher extends Component {
	constructor(props) {
		super(props);
		this.state = { error: false };
	}

	componentDidCatch(e) {
		if (e.then) {
			this.setState({ error: { message: '<Promise>' } });
		}
		else {
			this.setState({ error: e });
		}
	}

	render(props, state) {
		return state.error ? <div>Catcher did catch: {state.error.message}</div> : props.children;
	}
}

class ClassWrapper extends Component {
	render(props) {
		return (
			<div id="class-wrapper">
				{props.children}
			</div>
		);
	}
}

function FuncWrapper(props) {
	return (
		<div id="func-wrapper">
			{props.children}
		</div>
	);
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
		
		render(suspense, scratch);

		return suspense._component.__test__suspensions_timeout_race.then(() => {
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
	});

	it('should suspend when a promise is throw', () => {
		const s = <Suspendable render={() => <div>Hello</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<ClassWrapper>
					<FuncWrapper>
						{s}
					</FuncWrapper>
				</ClassWrapper>
			</Suspense>
		);
		
		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div id="class-wrapper"><div id="func-wrapper"><div>Hello</div></div></div>`
		);

		s._component.suspend();

		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div id="class-wrapper"><div id="func-wrapper"><div>Hello</div></div></div>`
					);
				});
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

		const s = <Suspendable render={() => <div>Suspense</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				{s}
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

		s._component.suspend();

		rerender();
	
		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);
			expect(componentWillMount).to.have.been.calledOnce;
			expect(componentDidMount).to.have.been.calledOnce;
			expect(componentWillUnmount).to.not.have.been.called;

			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
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

		const s = <Suspendable render={() => <div>Suspense</div>} />;

		const suspense = (
			<Suspense fallback={<LifecycleLogger />}>
				{s}
			</Suspense>
		);
		
		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>Suspense</div>`
		);
		expect(componentWillMount).to.not.have.been.called;
		expect(componentDidMount).to.not.have.been.called;
		expect(componentWillUnmount).to.not.have.been.called;

		s._component.suspend();

		rerender();
	
		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Lifecycle</div>`
			);
			expect(componentWillMount).to.have.been.calledOnce;
			expect(componentDidMount).to.have.been.calledOnce;
			expect(componentWillUnmount).to.not.have.been.called;

			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
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
	});

	it('should keep state of children when suspending', () => {
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

		const s = <Suspendable render={() => <div>Suspense</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				{s}
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

		s._component.suspend();

		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>Suspense</div><div>Stateful: first</div>`
					);
				});
		});
	});

	it('should allow siblings to update state while suspending', () => {
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

		const s = <Suspendable render={() => <div>Suspense</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				{s}
			</Suspense>
		);
		render(
			<Fragment>
				{/* TODO: This div is needed because of #1605 */}
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

		s._component.suspend();

		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div><div>Suspended...</div></div><div>Stateful: first</div>`
			);

			setState({ s: 'second' });
			rerender();

			expect(scratch.innerHTML).to.eql(
				`<div><div>Suspended...</div></div><div>Stateful: second</div>`
			);

			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div><div>Suspense</div></div><div>Stateful: second</div>`
					);
				});
		});
	});

	it('should suspend with custom error boundary', () => {
		const s = <Suspendable render={() => <div>within error boundary</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					{s}
				</Catcher>
			</Suspense>
		);

		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>within error boundary</div>`
		);

		s._component.suspend();
		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>within error boundary</div>`
					);
				});
		});
	});

	it('should support throwing suspense', () => {
		const s = <Suspendable render={() => <div>Hello</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					{s}
				</Catcher>
			</Suspense>
		);
		render(suspense, scratch);
		expect(scratch.innerHTML).to.eql(
			`<div>Hello</div>`
		);

		s._component.suspend();
		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s._component.reject(new Error('Thrown suspension'))
				.then(() => {
					expect(true).to.eql(false);
				}, () => {
					rerender();
				})
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					expect(scratch.innerHTML).to.eql(
						`<div>Hello</div>`
					);
				});
		});
	});

	it('should allow multiple children to suspend', () => {
		const s1 = <Suspendable render={() => <div>Hello first</div>} />;
		const s2 = <Suspendable render={() => <div>Hello second</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					{s1}
					{s2}
				</Catcher>
			</Suspense>
		);
		render(suspense, scratch);
		expect(scratch.innerHTML).to.eql(
			`<div>Hello first</div><div>Hello second</div>`
		);
		expect(s1._component.spies.render).to.have.been.calledOnce;
		expect(s2._component.spies.render).to.have.been.calledOnce;

		s1._component.suspend(false);
		s2._component.suspend(false);
		expect(s1._component.spies.render).to.have.been.calledOnce;
		expect(s2._component.spies.render).to.have.been.calledOnce;

		enqueueRender(suspense._component);
		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);
			expect(s1._component.spies.render).to.have.been.calledTwice;
			expect(s2._component.spies.render).to.have.been.calledTwice;

			return s1._component.resolve().then(() => {
				rerender();
				expect(scratch.innerHTML).to.eql(
					`<div>Suspended...</div>`
				);
				expect(s1._component.spies.render).to.have.been.calledTwice;
				expect(s2._component.spies.render).to.have.been.calledTwice;

				s2._component.resolve();
				return Promise.all(suspense._component._suspensions).then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>Hello first</div><div>Hello second</div>`
					);
					expect(s1._component.spies.render).to.have.been.calledThrice;
					expect(s2._component.spies.render).to.have.been.calledThrice;
				});
			});
		});
	});

	it('should call multiple nested suspending components render in one go', () => {
		const s1 = <Suspendable render={() => <div>Hello first</div>} />;
		const s2 = <Suspendable render={() => <div>Hello second</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<Catcher>
					{s1}
					<div>
						{s2}
					</div>
				</Catcher>
			</Suspense>
		);
		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>Hello first</div><div><div>Hello second</div></div>`
		);
		expect(s1._component.spies.render).to.have.been.calledOnce;
		expect(s1._component.spies.render).to.have.been.calledOnce;

		s1._component.suspend(false);
		s2._component.suspend(false);
		expect(s1._component.spies.render).to.have.been.calledOnce;
		expect(s1._component.spies.render).to.have.been.calledOnce;

		enqueueRender(s1._component);
		enqueueRender(s2._component);
		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);
			expect(s1._component.spies.render).to.have.been.calledTwice;
			expect(s1._component.spies.render).to.have.been.calledTwice;
			expect(suspense._component._suspensions.length).to.eql(2);
	
			return s1._component.resolve()
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>Suspended...</div>`
					);
					expect(s1._component.spies.render).to.have.been.calledTwice;
					expect(s1._component.spies.render).to.have.been.calledTwice;

					return s2._component.resolve()
						.then(() => Promise.all(suspense._component._suspensions))
						.then(() => {
							rerender();
							expect(scratch.innerHTML).to.eql(
								`<div>Hello first</div><div><div>Hello second</div></div>`
							);
							expect(s1._component.spies.render).to.have.been.calledThrice;
							expect(s1._component.spies.render).to.have.been.calledThrice;
						});
				});
		});
	});

	it('should support text directly under Suspense', () => {
		const s = <Suspendable render={() => <div>Hello</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				Text
				{/* Adding a <div> here will make things work... */}
				{s}
			</Suspense>
		);
		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`Text<div>Hello</div>`
		);

		s._component.suspend();
		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`Text<div>Hello</div>`
					);
				});
		});
	});

	it('should support to change DOM tag directly under suspense', () => {
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

		const s = <Suspendable render={() => <div>Hello</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended...</div>}>
				<StatefulComp defaultTag="div" />
				{s}
			</Suspense>
		);
		render(suspense, scratch);

		expect(scratch.innerHTML).to.eql(
			`<div>Stateful</div><div>Hello</div>`
		);

		s._component.suspend();
		rerender();

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			setState({ tag: 'article' });

			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<article>Stateful</article><div>Hello</div>`
					);
				});
		});
	});

	it('should only suspend the most inner Suspend', () => {
		const s = <Suspendable render={() => <div>Hello</div>} />;

		const suspense = (
			<Suspense fallback={<div>Suspended... 2</div>}>
				<Catcher>
					{s}
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

		s._component.suspend();
		rerender();
		
		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`Not suspended...<div>Suspended... 2</div>`
			);
			
			return s._component.resolve()
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`Not suspended...<div>Hello</div>`
					);
				});
		});
	});

	it('should throw when missing Suspense', () => {
		const s = <Suspendable render={() => <div>Hello</div>} />;

		render(
			<Catcher>
				{s}
			</Catcher>,
			scratch,
		);
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Hello</div>`
		);

		s._component.suspend();
		rerender();
		expect(scratch.innerHTML).to.eql(
			`<div>Catcher did catch: <Promise></div>`
		);
	});

	it('should throw when lazy\'s loader throws', () => {
		let reject;

		const ThrowingLazy = lazy(() => {
			const prom = new Promise((res, rej) => {
				reject = () => {
					rej(new Error('Thrown in lazy\'s loader...'));
					return prom;
				};
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

		return suspense._component.__test__suspensions_timeout_race.then(() => {
			expect(scratch.innerHTML).to.eql(
				`<div>Suspended...</div>`
			);

			return reject()
				.then(
					() => {
						expect(true).to.eql(false);
					},
					() => {}
				)
				.then(() => Promise.all(suspense._component._suspensions))
				.then(() => {
					rerender();
					expect(scratch.innerHTML).to.eql(
						`<div>Catcher did catch: Thrown in lazy's loader...</div>`
					);
				});
		});
	});
});
