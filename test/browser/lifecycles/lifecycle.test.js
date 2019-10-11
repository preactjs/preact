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

	function deepFreeze(arr) {
		return arr.map(o => typeof o === 'object' ? Object.freeze(o) : o);
	}

	it('should call nested new lifecycle methods in the right order', () => {
		let updateOuterState;
		let updateInnerState;
		let forceUpdateOuter;
		let forceUpdateInner;

		let log;
		function logger(msg) {
			return function(...args) {
				// return true for shouldComponentUpdate
				log.push([msg, ...deepFreeze(args)]);
				return true;
			};
		}

		class Outer extends Component {
			static getDerivedStateFromProps(...args) {
				log.push(['outer getDerivedStateFromProps', ...deepFreeze(args)]);
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
						<InnerPrevious outerValue={this.state.value} />
						<Inner x={this.props.x} outerValue={this.state.value} />
						<InnerNext outerValue={this.state.value} />
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
			static getDerivedStateFromProps(...args) {
				log.push(['inner getDerivedStateFromProps', ...deepFreeze(args)]);
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

		class InnerPrevious extends Component {
			static getDerivedStateFromProps(...args) {
				log.push(['inner-previous getDerivedStateFromProps', ...deepFreeze(args)]);
				return null;
			}
			constructor() {
				super();
				log.push('inner-previous constructor');
			}
			render() {
				log.push('inner-previous render');
				return <span>{this.props.x} {this.props.outerValue}</span>;
			}
		}

		class InnerNext extends Component {
			static getDerivedStateFromProps(...args) {
				log.push(['inner-next getDerivedStateFromProps', ...deepFreeze(args)]);
				return null;
			}
			constructor() {
				super();
				log.push('inner-next constructor');
			}
			render() {
				log.push('inner-next render');
				return <span>{this.props.x} {this.props.outerValue}</span>;
			}
		}

		Object.assign(Inner.prototype, {
			componentDidMount: logger('inner componentDidMount'),
			shouldComponentUpdate: logger('inner shouldComponentUpdate'),
			getSnapshotBeforeUpdate: logger('inner getSnapshotBeforeUpdate'),
			componentDidUpdate: logger('inner componentDidUpdate'),
			componentWillUnmount: logger('inner componentWillUnmount')
		});

		Object.assign(InnerPrevious.prototype, {
			componentDidMount: logger('inner-previous componentDidMount'),
			shouldComponentUpdate: logger('inner-previous shouldComponentUpdate'),
			getSnapshotBeforeUpdate: logger('inner-previous getSnapshotBeforeUpdate'),
			componentDidUpdate: logger('inner-previous componentDidUpdate'),
			componentWillUnmount: logger('inner-previous componentWillUnmount')
		});

		Object.assign(InnerNext.prototype, {
			componentDidMount: logger('inner-next componentDidMount'),
			shouldComponentUpdate: logger('inner-next shouldComponentUpdate'),
			getSnapshotBeforeUpdate: logger('inner-next getSnapshotBeforeUpdate'),
			componentDidUpdate: logger('inner-next componentDidUpdate'),
			componentWillUnmount: logger('inner-next componentWillUnmount')
		});

		// Constructor & mounting
		log = [];
		render(<Outer x={1} />, scratch);
		expect(log).to.deep.equal([
			'outer constructor',
			['outer getDerivedStateFromProps', { x: 1 }, { value: 0 }],
			'outer render',
			'inner-previous constructor',
			['inner-previous getDerivedStateFromProps', { outerValue: 0 }, {}],
			'inner-previous render',
			'inner constructor',
			['inner getDerivedStateFromProps', { outerValue: 0, x: 1 }, { value: 0 }],
			'inner render',
			'inner-next constructor',
			['inner-next getDerivedStateFromProps', { outerValue: 0 }, {}],
			'inner-next render',
			['inner-previous componentDidMount'],
			['inner componentDidMount'],
			['inner-next componentDidMount'],
			['outer componentDidMount']
		]);

		// Outer & Inner props update
		log = [];
		render(<Outer x={2} />, scratch);
		expect(log).to.deep.equal([
			['outer getDerivedStateFromProps', { x: 2 }, { value: 0 }],
			['outer shouldComponentUpdate', { x: 2 }, { value: 0 }, {}],
			'outer render',
			['inner-previous getDerivedStateFromProps', { outerValue: 0 }, {}],
			['inner-previous shouldComponentUpdate', { outerValue: 0 }, {}, {}],
			'inner-previous render',
			['inner getDerivedStateFromProps', { outerValue: 0, x: 2 }, { value: 0 }],
			['inner shouldComponentUpdate', { outerValue: 0, x: 2 }, { value: 0 }, {}],
			'inner render',
			['inner-next getDerivedStateFromProps', { outerValue: 0 }, {}],
			['inner-next shouldComponentUpdate', { outerValue: 0 }, {}, {}],
			'inner-next render',
			['inner-previous getSnapshotBeforeUpdate', { outerValue: 0 }, {}],
			['inner getSnapshotBeforeUpdate', { outerValue: 0, x: 1 }, { value: 0 }],
			['inner-next getSnapshotBeforeUpdate', { outerValue: 0 }, {}],
			['outer getSnapshotBeforeUpdate', { x: 1 }, { value: 0 }],
			['inner-previous componentDidUpdate', { outerValue: 0 }, {}, true],
			['inner componentDidUpdate', { x: 1, outerValue: 0 }, { value: 0 }, true],
			['inner-next componentDidUpdate', { outerValue: 0 }, {}, true],
			['outer componentDidUpdate', { x: 1 }, { value: 0 }, true]
		]);

		// Outer state update & Inner props update
		log = [];
		updateOuterState();
		rerender();
		expect(log).to.deep.equal([
			['outer getDerivedStateFromProps', { x: 2 }, { value: 1 }],
			['outer shouldComponentUpdate', { x: 2 }, { value: 1 }, {}],
			'outer render',
			['inner-previous getDerivedStateFromProps', { outerValue: 1 }, {}],
			['inner-previous shouldComponentUpdate', { outerValue: 1 }, {}, {}],
			'inner-previous render',
			['inner getDerivedStateFromProps', { outerValue: 1, x: 2 }, { value: 0 }],
			['inner shouldComponentUpdate', { outerValue: 1, x: 2 }, { value: 0 }, {}],
			'inner render',
			['inner-next getDerivedStateFromProps', { outerValue: 1 }, {}],
			['inner-next shouldComponentUpdate', { outerValue: 1 }, {}, {}],
			'inner-next render',
			['inner-previous getSnapshotBeforeUpdate', { outerValue: 0 }, {}],
			['inner getSnapshotBeforeUpdate', { outerValue: 0, x: 2 }, { value: 0 }],
			['inner-next getSnapshotBeforeUpdate', { outerValue: 0 }, {}],
			['outer getSnapshotBeforeUpdate', { x: 2 }, { value: 0 }],
			['inner-previous componentDidUpdate', { outerValue: 0 }, {}, true],
			['inner componentDidUpdate', { outerValue: 0, x: 2 }, { value: 0 }, true],
			['inner-next componentDidUpdate', { outerValue: 0 }, {}, true],
			['outer componentDidUpdate', { x: 2 }, { value: 0 }, true]
		]);

		// Inner state update
		log = [];
		updateInnerState();
		rerender();
		expect(log).to.deep.equal([
			['inner getDerivedStateFromProps', { outerValue: 1, x: 2 }, { value: 1 }],
			['inner shouldComponentUpdate', { outerValue: 1, x: 2 }, { value: 1 }, {}],
			'inner render',
			['inner getSnapshotBeforeUpdate', { outerValue: 1, x: 2 }, { value: 0 }],
			['inner componentDidUpdate', { outerValue: 1, x: 2 }, { value: 0 }, true]
		]);

		// Force update Outer
		log = [];
		forceUpdateOuter();
		rerender();
		expect(log).to.deep.equal([
			['outer getDerivedStateFromProps', { x: 2 }, { value: 1 }],
			'outer render',
			['inner-previous getDerivedStateFromProps', { outerValue: 1 }, {}],
			['inner-previous shouldComponentUpdate', { outerValue: 1 }, {}, {}],
			'inner-previous render',
			['inner getDerivedStateFromProps', { outerValue: 1, x: 2 }, { value: 1 }],
			['inner shouldComponentUpdate', { outerValue: 1, x: 2 }, { value: 1 }, {}],
			'inner render',
			['inner-next getDerivedStateFromProps', { outerValue: 1 }, {}],
			['inner-next shouldComponentUpdate', { outerValue: 1 }, {}, {}],
			'inner-next render',
			['inner-previous getSnapshotBeforeUpdate', { outerValue: 1 }, {}],
			['inner getSnapshotBeforeUpdate', { outerValue: 1, x: 2 }, { value: 1 }],
			['inner-next getSnapshotBeforeUpdate', { outerValue: 1 }, {}],
			['outer getSnapshotBeforeUpdate', { x: 2 }, { value: 1 }],
			['inner-previous componentDidUpdate', { outerValue: 1 }, {}, true],
			['inner componentDidUpdate', { outerValue: 1, x: 2 }, { value: 1 }, true],
			['inner-next componentDidUpdate', { outerValue: 1 }, {}, true],
			['outer componentDidUpdate', { x: 2 }, { value: 1 }, true]
		]);

		// Force update Inner
		log = [];
		forceUpdateInner();
		rerender();
		expect(log).to.deep.equal([
			['inner getDerivedStateFromProps', { outerValue: 1, x: 2 }, { value: 1 }],
			'inner render',
			['inner getSnapshotBeforeUpdate', { outerValue: 1, x: 2 }, { value: 1 }],
			['inner componentDidUpdate', { outerValue: 1, x: 2 }, { value: 1 }, true]
		]);

		// TODO: unmount order is different to react, react calls willUnmount on outer last
		// Unmounting Outer & Inner
		log = [];
		render(<table />, scratch);
		expect(log).to.deep.equal([
			['inner-previous componentWillUnmount'],
			['inner componentWillUnmount'],
			['inner-next componentWillUnmount'],
			['outer componentWillUnmount']
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
			rerender();

			expect(proto.componentWillUnmount).to.have.been.called;

			reset();
			setState({ show: true });
			rerender();

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
