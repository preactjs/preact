import { setupRerender } from 'preact/test-utils';
import { createElement as h, render, Component } from '../../../src/index';
import { setupScratch, teardown, spyAll } from '../../_util/helpers';

/** @jsx h */

describe('Lifecycle methods', () => {

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

	it('should call nested new lifecycle methods in the right order', () => {
		let updateOuterState;
		let updateInnerState;
		let forceUpdateOuter;
		let forceUpdateInner;

		let log;
		function logger(msg) {
			return function() {
				// return true for shouldComponentUpdate
				log.push(msg);
				return true;
			};
		}

		class Outer extends Component {
			static getDerivedStateFromProps() {
				log.push('outer getDerivedStateFromProps');
				return null;
			}
			constructor() {
				super();
				log.push('outer constructor');

				this.state = { value: 0 };
				forceUpdateOuter = () => this.forceUpdate();
				updateOuterState = () => this.setState({
					value: (this.state.value + 1) % 2
				});
			}
			render() {
				log.push('outer render');
				return (
					<div>
						<Inner x={this.props.x} outerValue={this.state.value} />
					</div>
				);
			}
		}
		Object.assign(Outer.prototype, {
			componentDidMount: logger('outer componentDidMount'),
			shouldComponentUpdate: logger('outer shouldComponentUpdate'),
			getSnapshotBeforeUpdate: logger('outer getSnapshotBeforeUpdate'),
			componentDidUpdate: logger('outer componentDidUpdate'),
			componentWillUnmount: logger('outer componentWillUnmount')
		});

		class Inner extends Component {
			static getDerivedStateFromProps() {
				log.push('inner getDerivedStateFromProps');
				return null;
			}
			constructor() {
				super();
				log.push('inner constructor');

				this.state = { value: 0 };
				forceUpdateInner = () => this.forceUpdate();
				updateInnerState = () => this.setState({
					value: (this.state.value + 1) % 2
				});
			}
			render() {
				log.push('inner render');
				return <span>{this.props.x} {this.props.outerValue} {this.state.value}</span>;
			}
		}
		Object.assign(Inner.prototype, {
			componentDidMount: logger('inner componentDidMount'),
			shouldComponentUpdate: logger('inner shouldComponentUpdate'),
			getSnapshotBeforeUpdate: logger('inner getSnapshotBeforeUpdate'),
			componentDidUpdate: logger('inner componentDidUpdate'),
			componentWillUnmount: logger('inner componentWillUnmount')
		});

		// Constructor & mounting
		log = [];
		render(<Outer x={1} />, scratch);
		expect(log).to.deep.equal([
			'outer constructor',
			'outer getDerivedStateFromProps',
			'outer render',
			'inner constructor',
			'inner getDerivedStateFromProps',
			'inner render',
			'inner componentDidMount',
			'outer componentDidMount'
		]);

		// Outer & Inner props update
		log = [];
		render(<Outer x={2} />, scratch);
		// Note: we differ from react here in that we apply changes to the dom
		// as we find them while diffing. React on the other hand separates this
		// into specific phases, meaning changes to the dom are only flushed
		// once the whole diff-phase is complete. This is why
		// "outer getSnapshotBeforeUpdate" is called just before the "inner" hooks.
		// For react this call would be right before "outer componentDidUpdate"
		expect(log).to.deep.equal([
			'outer getDerivedStateFromProps',
			'outer shouldComponentUpdate',
			'outer render',
			'outer getSnapshotBeforeUpdate',
			'inner getDerivedStateFromProps',
			'inner shouldComponentUpdate',
			'inner render',
			'inner getSnapshotBeforeUpdate',
			'inner componentDidUpdate',
			'outer componentDidUpdate'
		]);

		// Outer state update & Inner props update
		log = [];
		updateOuterState();
		rerender();
		expect(log).to.deep.equal([
			'outer getDerivedStateFromProps',
			'outer shouldComponentUpdate',
			'outer render',
			'outer getSnapshotBeforeUpdate',
			'inner getDerivedStateFromProps',
			'inner shouldComponentUpdate',
			'inner render',
			'inner getSnapshotBeforeUpdate',
			'inner componentDidUpdate',
			'outer componentDidUpdate'
		]);

		// Inner state update
		log = [];
		updateInnerState();
		rerender();
		expect(log).to.deep.equal([
			'inner getDerivedStateFromProps',
			'inner shouldComponentUpdate',
			'inner render',
			'inner getSnapshotBeforeUpdate',
			'inner componentDidUpdate'
		]);

		// Force update Outer
		log = [];
		forceUpdateOuter();
		rerender();
		expect(log).to.deep.equal([
			'outer getDerivedStateFromProps',
			'outer render',
			'outer getSnapshotBeforeUpdate',
			'inner getDerivedStateFromProps',
			'inner shouldComponentUpdate',
			'inner render',
			'inner getSnapshotBeforeUpdate',
			'inner componentDidUpdate',
			'outer componentDidUpdate'
		]);

		// Force update Inner
		log = [];
		forceUpdateInner();
		rerender();
		expect(log).to.deep.equal([
			'inner getDerivedStateFromProps',
			'inner render',
			'inner getSnapshotBeforeUpdate',
			'inner componentDidUpdate'
		]);

		// Unmounting Outer & Inner
		log = [];
		render(<table />, scratch);
		expect(log).to.deep.equal([
			'outer componentWillUnmount',
			'inner componentWillUnmount'
		]);

	});

	let _it = it;
	describe('#constructor and component(Did|Will)(Mount|Unmount)', () => {
		/* global DISABLE_FLAKEY */
		let it = DISABLE_FLAKEY ? xit : _it;

		let setState;
		class Outer extends Component {
			constructor(p, c) {
				super(p, c);
				this.state = { show: true };
				setState = s => this.setState(s);
			}
			render(props, { show }) {
				return (
					<div>
						{ show && (
							<Inner {...props} />
						) }
					</div>
				);
			}
		}

		class LifecycleTestComponent extends Component {
			componentWillMount() {}
			componentDidMount() {}
			componentWillUnmount() {}
			render() { return <div />; }
		}

		class Inner extends LifecycleTestComponent {
			render() {
				return (
					<div>
						<InnerMost />
					</div>
				);
			}
		}

		class InnerMost extends LifecycleTestComponent {
			render() { return <div />; }
		}

		let spies = ['componentWillMount', 'componentDidMount', 'componentWillUnmount'];

		let verifyLifecycleMethods = (TestComponent) => {
			let proto = TestComponent.prototype;
			spies.forEach( s => sinon.spy(proto, s) );
			let reset = () => spies.forEach( s => proto[s].resetHistory() );

			it('should be invoked for components on initial render', () => {
				reset();
				render(<Outer />, scratch);
				expect(proto.componentDidMount).to.have.been.called;
				expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
				expect(proto.componentDidMount).to.have.been.called;
			});

			it('should be invoked for components on unmount', () => {
				reset();
				setState({ show: false });
				rerender();

				expect(proto.componentWillUnmount).to.have.been.called;
			});

			it('should be invoked for components on re-render', () => {
				reset();
				setState({ show: true });
				rerender();

				expect(proto.componentDidMount).to.have.been.called;
				expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
				expect(proto.componentDidMount).to.have.been.called;
			});
		};

		describe('inner components', () => {
			verifyLifecycleMethods(Inner);
		});

		describe('innermost components', () => {
			verifyLifecycleMethods(InnerMost);
		});

		describe('when shouldComponentUpdate() returns false', () => {
			let setState;

			class Outer extends Component {
				constructor() {
					super();
					this.state = { show: true };
					setState = s => this.setState(s);
				}
				render(props, { show }) {
					return (
						<div>
							{ show && (
								<div>
									<Inner {...props} />
								</div>
							) }
						</div>
					);
				}
			}

			class Inner extends Component {
				shouldComponentUpdate(){ return false; }
				componentWillMount() {}
				componentDidMount() {}
				componentWillUnmount() {}
				render() {
					return <div />;
				}
			}

			let proto = Inner.prototype;
			let spies = ['componentWillMount', 'componentDidMount', 'componentWillUnmount'];
			spies.forEach( s => sinon.spy(proto, s) );

			let reset = () => spies.forEach( s => proto[s].resetHistory() );

			beforeEach( () => reset() );

			it('should be invoke normally on initial mount', () => {
				render(<Outer />, scratch);
				expect(proto.componentWillMount).to.have.been.called;
				expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
				expect(proto.componentDidMount).to.have.been.called;
			});

			it('should be invoked normally on unmount', () => {
				setState({ show: false });
				rerender();

				expect(proto.componentWillUnmount).to.have.been.called;
			});

			it('should still invoke mount for shouldComponentUpdate():false', () => {
				setState({ show: true });
				rerender();

				expect(proto.componentWillMount).to.have.been.called;
				expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
				expect(proto.componentDidMount).to.have.been.called;
			});

			it('should still invoke unmount for shouldComponentUpdate():false', () => {
				setState({ show: false });
				rerender();

				expect(proto.componentWillUnmount).to.have.been.called;
			});
		});
	});

	describe('#setState', () => {
		// From preactjs/preact#1170
		it('should NOT mutate state, only create new versions', () => {
			const stateConstant = {};
			let didMount = false;
			let componentState;

			class Stateful extends Component {
				constructor() {
					super(...arguments);
					this.state = stateConstant;
				}

				componentDidMount() {
					didMount = true;

					// eslint-disable-next-line react/no-did-mount-set-state
					this.setState({ key: 'value' }, () => {
						componentState = this.state;
					});
				}

				render() {
					return <div />;
				}
			}

			render(<Stateful />, scratch);
			rerender();

			expect(didMount).to.equal(true);
			expect(componentState).to.deep.equal({ key: 'value' });
			expect(stateConstant).to.deep.equal({});
		});

		// This feature is not mentioned in the docs, but is part of the release
		// notes for react v16.0.0: https://reactjs.org/blog/2017/09/26/react-v16.0.html#breaking-changes
		it('should abort if updater function returns null', () => {
			let updateState;
			class Foo extends Component {
				constructor() {
					super();
					this.state = { value: 0 };
					updateState = () => this.setState(prev => {
						prev.value++;
						return null;
					});
				}

				render() {
					return 'value: ' + this.state.value;
				}
			}

			let renderSpy = sinon.spy(Foo.prototype, 'render');
			render(<Foo />, scratch);
			renderSpy.resetHistory();

			updateState();
			rerender();
			expect(renderSpy).to.not.be.called;
		});

		it('should call callback with correct this binding', () => {
			let inst;
			let updateState;
			class Foo extends Component {
				constructor() {
					super();
					updateState = () => this.setState({}, this.onUpdate);
				}

				onUpdate() {
					inst = this;
				}
			}

			render(<Foo />, scratch);
			updateState();
			rerender();

			expect(inst).to.be.instanceOf(Foo);
		});
	});

	describe('Lifecycle DOM Timing', () => {
		it('should be invoked when dom does (DidMount, WillUnmount) or does not (WillMount, DidUnmount) exist', () => {
			let setState;
			class Outer extends Component {
				constructor() {
					super();
					this.state = { show: true };
					setState = s => {
						this.setState(s);
						this.forceUpdate();
					};
				}
				componentWillMount() {
					expect(document.getElementById('OuterDiv'), 'Outer componentWillMount').to.not.exist;
				}
				componentDidMount() {
					expect(document.getElementById('OuterDiv'), 'Outer componentDidMount').to.exist;
				}
				componentWillUnmount() {
					expect(document.getElementById('OuterDiv'), 'Outer componentWillUnmount').to.exist;
					setTimeout( () => {
						expect(document.getElementById('OuterDiv'), 'Outer after componentWillUnmount').to.not.exist;
					}, 0);
				}
				render(props, { show }) {
					return (
						<div id="OuterDiv">
							{ show && (
								<div>
									<Inner {...props} />
								</div>
							) }
						</div>
					);
				}
			}

			class Inner extends Component {
				componentWillMount() {
					expect(document.getElementById('InnerDiv'), 'Inner componentWillMount').to.not.exist;
				}
				componentDidMount() {
					expect(document.getElementById('InnerDiv'), 'Inner componentDidMount').to.exist;
				}
				componentWillUnmount() {
					// @TODO Component mounted into elements (non-components)
					// are currently unmounted after those elements, so their
					// DOM is unmounted prior to the method being called.
					//expect(document.getElementById('InnerDiv'), 'Inner componentWillUnmount').to.exist;
					setTimeout( () => {
						expect(document.getElementById('InnerDiv'), 'Inner after componentWillUnmount').to.not.exist;
					}, 0);
				}

				render() {
					return <div id="InnerDiv" />;
				}
			}

			let proto = Inner.prototype;
			let spies = ['componentWillMount', 'componentDidMount', 'componentWillUnmount'];
			spies.forEach( s => sinon.spy(proto, s) );

			let reset = () => spies.forEach( s => proto[s].resetHistory() );

			render(<Outer />, scratch);
			expect(proto.componentWillMount).to.have.been.called;
			expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
			expect(proto.componentDidMount).to.have.been.called;

			reset();
			setState({ show: false });

			expect(proto.componentWillUnmount).to.have.been.called;

			reset();
			setState({ show: true });

			expect(proto.componentWillMount).to.have.been.called;
			expect(proto.componentWillMount).to.have.been.calledBefore(proto.componentDidMount);
			expect(proto.componentDidMount).to.have.been.called;
		});

		it('should remove this.base for HOC', () => {
			let createComponent = (name, fn) => {
				class C extends Component {
					componentWillUnmount() {
						expect(this.base, `${name}.componentWillUnmount`).to.exist;
						setTimeout( () => {
							expect(this.base, `after ${name}.componentWillUnmount`).not.to.exist;
						}, 0);
					}
					render(props) { return fn(props); }
				}
				spyAll(C.prototype);
				return C;
			};

			class Wrapper extends Component {
				render({ children }) {
					return <div class="wrapper">{children}</div>;
				}
			}

			let One = createComponent('One', () => <Wrapper>one</Wrapper> );
			let Two = createComponent('Two', () => <Wrapper>two</Wrapper> );
			let Three = createComponent('Three', () => <Wrapper>three</Wrapper> );

			let components = [One, Two, Three];

			let Selector = createComponent('Selector', ({ page }) => {
				let Child = components[page];
				return Child && <Child />;
			});

			let app;
			class App extends Component {
				constructor() {
					super();
					app = this;
				}

				render(_, { page }) {
					return <Selector page={page} />;
				}
			}

			render(<App />, scratch);

			for (let i=0; i<20; i++) {
				app.setState({ page: i%components.length });
				app.forceUpdate();
			}
		});
	});
});
