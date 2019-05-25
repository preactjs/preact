import { setupRerender } from 'preact/test-utils';
import { createElement as h, render, Component, Fragment } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx h */

let spyAll = obj => Object.keys(obj).forEach( key => sinon.spy(obj,key) );
let resetAllSpies = obj => Object.keys(obj).forEach( key => {
	if (obj[key].args) {
		obj[key].resetHistory();
	}
});

// const EMPTY_CHILDREN = [];

describe('Lifecycle methods', () => {
	let scratch, rerender;

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

	describe('static getDerivedStateFromProps', () => {
		it('should set initial state with value returned from getDerivedStateFromProps', () => {
			class Foo extends Component {
				static getDerivedStateFromProps(props) {
					return {
						foo: props.foo,
						bar: 'bar'
					};
				}
				render() {
					return <div className={`${this.state.foo} ${this.state.bar}`} />;
				}
			}

			render(<Foo foo="foo" />, scratch);
			expect(scratch.firstChild.className).to.be.equal('foo bar');
		});

		it('should update initial state with value returned from getDerivedStateFromProps', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						foo: 'foo',
						bar: 'bar'
					};
				}
				static getDerivedStateFromProps(props, state) {
					return {
						foo: `not-${state.foo}`
					};
				}
				render() {
					return <div className={`${this.state.foo} ${this.state.bar}`} />;
				}
			}

			render(<Foo />, scratch);
			expect(scratch.firstChild.className).to.equal('not-foo bar');
		});

		it('should update the instance\'s state with the value returned from getDerivedStateFromProps when props change', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						value: 'initial'
					};
				}
				static getDerivedStateFromProps(props) {
					if (props.update) {
						return {
							value: 'updated'
						};
					}

					return null;
				}
				componentDidMount() {}
				componentDidUpdate() {}
				render() {
					return <div className={this.state.value} />;
				}
			}

			sinon.spy(Foo, 'getDerivedStateFromProps');
			sinon.spy(Foo.prototype, 'componentDidMount');
			sinon.spy(Foo.prototype, 'componentDidUpdate');

			render(<Foo update={false} />, scratch);
			expect(scratch.firstChild.className).to.equal('initial');
			expect(Foo.getDerivedStateFromProps).to.have.callCount(1);
			expect(Foo.prototype.componentDidMount).to.have.callCount(1); // verify mount occurred
			expect(Foo.prototype.componentDidUpdate).to.have.callCount(0);

			render(<Foo update />, scratch);
			expect(scratch.firstChild.className).to.equal('updated');
			expect(Foo.getDerivedStateFromProps).to.have.callCount(2);
			expect(Foo.prototype.componentDidMount).to.have.callCount(1);
			expect(Foo.prototype.componentDidUpdate).to.have.callCount(1); // verify update occurred
		});

		it('should update the instance\'s state with the value returned from getDerivedStateFromProps when state changes', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						value: 'initial'
					};
				}
				static getDerivedStateFromProps(props, state) {
					// Don't change state for call that happens after the constructor
					if (state.value === 'initial') {
						return null;
					}

					return {
						value: state.value + ' derived'
					};
				}
				componentDidMount() {
					// eslint-disable-next-line react/no-did-mount-set-state
					this.setState({ value: 'updated' });
				}
				render() {
					return <div className={this.state.value} />;
				}
			}

			sinon.spy(Foo, 'getDerivedStateFromProps');

			render(<Foo />, scratch);
			expect(scratch.firstChild.className).to.equal('initial');
			expect(Foo.getDerivedStateFromProps).to.have.been.calledOnce;

			rerender(); // call rerender to handle cDM setState call
			expect(scratch.firstChild.className).to.equal('updated derived');
			expect(Foo.getDerivedStateFromProps).to.have.been.calledTwice;
		});

		it('should NOT modify state if null is returned', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						foo: 'foo',
						bar: 'bar'
					};
				}
				static getDerivedStateFromProps() {
					return null;
				}
				render() {
					return <div className={`${this.state.foo} ${this.state.bar}`} />;
				}
			}

			sinon.spy(Foo, 'getDerivedStateFromProps');

			render(<Foo />, scratch);
			expect(scratch.firstChild.className).to.equal('foo bar');
			expect(Foo.getDerivedStateFromProps).to.have.been.called;
		});

		// NOTE: Difference from React
		// React v16.3.2 warns if undefined if returned from getDerivedStateFromProps
		it('should NOT modify state if undefined is returned', () => {
			class Foo extends Component {
				constructor(props, context) {
					super(props, context);
					this.state = {
						foo: 'foo',
						bar: 'bar'
					};
				}
				static getDerivedStateFromProps() {}
				render() {
					return <div className={`${this.state.foo} ${this.state.bar}`} />;
				}
			}

			sinon.spy(Foo, 'getDerivedStateFromProps');

			render(<Foo />, scratch);
			expect(scratch.firstChild.className).to.equal('foo bar');
			expect(Foo.getDerivedStateFromProps).to.have.been.called;
		});

		it('should NOT invoke deprecated lifecycles (cWM/cWRP) if new static gDSFP is present', () => {
			class Foo extends Component {
				static getDerivedStateFromProps() {}
				componentWillMount() {}
				componentWillReceiveProps() {}
				render() {
					return <div />;
				}
			}

			sinon.spy(Foo, 'getDerivedStateFromProps');
			sinon.spy(Foo.prototype, 'componentWillMount');
			sinon.spy(Foo.prototype, 'componentWillReceiveProps');

			render(<Foo />, scratch);
			expect(Foo.getDerivedStateFromProps).to.have.been.called;
			expect(Foo.prototype.componentWillMount).to.not.have.been.called;
			expect(Foo.prototype.componentWillReceiveProps).to.not.have.been.called;
		});

		it('is not called if neither state nor props have changed', () => {
			let logs = [];
			let childRef;

			class Parent extends Component {
				constructor(props) {
					super(props);
					this.state = { parentRenders: 0 };
				}

				static getDerivedStateFromProps(props, state) {
					logs.push('parent getDerivedStateFromProps');
					return state.parentRenders + 1;
				}

				render() {
					logs.push('parent render');
					return <Child parentRenders={this.state.parentRenders} />;
				}
			}

			class Child extends Component {
				constructor(props) {
					super(props);
					childRef = this;
				}
				render() {
					logs.push('child render');
					return this.props.parentRenders;
				}
			}

			render(<Parent />, scratch);
			expect(logs).to.deep.equal([
				'parent getDerivedStateFromProps',
				'parent render',
				'child render'
			]);

			logs = [];
			childRef.setState({});
			rerender();
			expect(logs).to.deep.equal([
				'child render'
			]);
		});

		// TODO: Investigate this test:
		// [should not override state with stale values if prevState is spread within getDerivedStateFromProps](https://github.com/facebook/react/blob/25dda90c1ecb0c662ab06e2c80c1ee31e0ae9d36/packages/react-dom/src/__tests__/ReactComponentLifeCycle-test.js#L1035)

		it('should be passed next props and state', () => {

			/** @type {() => void} */
			let updateState;

			let propsArg;
			let stateArg;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
					updateState = () => this.setState({
						value: this.state.value + 1
					});
				}
				static getDerivedStateFromProps(props, state) {
					// These object references might be updated later so copy
					// object so we can assert their values at this snapshot in time
					propsArg = { ...props };
					stateArg = { ...state };

					// NOTE: Don't do this in real production code!
					// https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
					return {
						value: state.value + 1
					};
				}
				render() {
					return <div>{this.state.value}</div>;
				}
			}

			// Initial render
			// state.value: initialized to 0 in constructor, 0 -> 1 in gDSFP
			render(<Foo foo="foo" />, scratch);

			let element = scratch.firstChild;
			expect(element.textContent).to.be.equal('1');
			expect(propsArg).to.deep.equal({
				foo: 'foo'
			});
			expect(stateArg).to.deep.equal({
				value: 0
			});

			// New Props
			// state.value: 1 -> 2 in gDSFP
			render(<Foo foo="bar" />, scratch);
			expect(element.textContent).to.be.equal('2');
			expect(propsArg).to.deep.equal({
				foo: 'bar'
			});
			expect(stateArg).to.deep.equal({
				value: 1
			});

			// New state
			// state.value: 2 -> 3 in updateState, 3 -> 4 in gDSFP
			updateState();
			rerender();
			expect(element.textContent).to.be.equal('4');
			expect(propsArg).to.deep.equal({
				foo: 'bar'
			});
			expect(stateArg).to.deep.equal({
				value: 3
			});

			// New Props (see #1446)
			// 4 -> 5 in gDSFP
			render(<Foo foo="baz" />, scratch);
			expect(element.textContent).to.be.equal('5');
			expect(stateArg).to.deep.equal({
				value: 4
			});

			// New Props (see #1446)
			// 5 -> 6 in gDSFP
			render(<Foo foo="qux" />, scratch);
			expect(element.textContent).to.be.equal('6');
			expect(stateArg).to.deep.equal({
				value: 5
			});
		});

		// From preactjs/preact#1170
		it('should NOT mutate state on mount, only create new versions', () => {
			const stateConstant = {};
			let componentState;

			class Stateful extends Component {
				static getDerivedStateFromProps() {
					return { key: 'value' };
				}

				constructor() {
					super(...arguments);
					this.state = stateConstant;
				}

				componentDidMount() {
					componentState = this.state;
				}

				render() {
					return <div />;
				}
			}

			render(<Stateful />, scratch);

			// Verify captured object references didn't get mutated
			expect(componentState).to.deep.equal({ key: 'value' });
			expect(stateConstant).to.deep.equal({});
		});

		it('should NOT mutate state on update, only create new versions', () => {
			const initialState = {};
			const capturedStates = [];

			let setState;

			class Stateful extends Component {
				static getDerivedStateFromProps(props, state) {
					return { value: (state.value || 0) + 1 };
				}

				constructor() {
					super(...arguments);
					this.state = initialState;
					capturedStates.push(this.state);

					setState = this.setState.bind(this);
				}

				componentDidMount() {
					capturedStates.push(this.state);
				}

				componentDidUpdate() {
					capturedStates.push(this.state);
				}

				render() {
					return <div />;
				}
			}

			render(<Stateful />, scratch);

			setState({ value: 10 });
			rerender();

			// Verify captured object references didn't get mutated
			expect(capturedStates).to.deep.equal([
				{},
				{ value: 1 },
				{ value: 11 }
			]);
		});
	});

	describe('#getSnapshotBeforeUpdate', () => {
		it('should pass the return value from getSnapshotBeforeUpdate to componentDidUpdate', () => {
			let log = [];

			class MyComponent extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
				}
				static getDerivedStateFromProps(nextProps, prevState) {
					return {
						value: prevState.value + 1
					};
				}
				getSnapshotBeforeUpdate(prevProps, prevState) {
					log.push(
						`getSnapshotBeforeUpdate() prevProps:${prevProps.value} prevState:${
							prevState.value
						}`,
					);
					return 'abc';
				}
				componentDidUpdate(prevProps, prevState, snapshot) {
					log.push(
						`componentDidUpdate() prevProps:${prevProps.value} prevState:${
							prevState.value
						} snapshot:${snapshot}`,
					);
				}
				render() {
					log.push('render');
					return null;
				}
			}

			render(<MyComponent value="foo" />, scratch);
			expect(log).to.deep.equal(['render']);
			log = [];

			render(<MyComponent value="bar" />, scratch);
			expect(log).to.deep.equal([
				'render',
				'getSnapshotBeforeUpdate() prevProps:foo prevState:1',
				'componentDidUpdate() prevProps:foo prevState:1 snapshot:abc'
			]);
			log = [];

			render(<MyComponent value="baz" />, scratch);
			expect(log).to.deep.equal([
				'render',
				'getSnapshotBeforeUpdate() prevProps:bar prevState:2',
				'componentDidUpdate() prevProps:bar prevState:2 snapshot:abc'
			]);
			log = [];

			render(<div />, scratch, scratch.firstChild);
			expect(log).to.deep.equal([]);
		});

		it('should call getSnapshotBeforeUpdate before mutations are committed', () => {
			let log = [];

			class MyComponent extends Component {
				getSnapshotBeforeUpdate(prevProps) {
					log.push('getSnapshotBeforeUpdate');
					expect(this.divRef.textContent).to.equal(
						`value:${prevProps.value}`,
					);
					return 'foobar';
				}
				componentDidUpdate(prevProps, prevState, snapshot) {
					log.push('componentDidUpdate');
					expect(this.divRef.textContent).to.equal(
						`value:${this.props.value}`,
					);
					expect(snapshot).to.equal('foobar');
				}
				render() {
					log.push('render');
					return <div ref={ref => this.divRef = ref}>{`value:${this.props.value}`}</div>;
				}
			}

			render(<MyComponent value="foo" />, scratch);
			expect(log).to.deep.equal(['render']);
			log = [];

			render(<MyComponent value="bar" />, scratch);
			expect(log).to.deep.equal([
				'render',
				'getSnapshotBeforeUpdate',
				'componentDidUpdate'
			]);
		});

		it('should be passed the previous props and state', () => {

			/** @type {() => void} */
			let updateState;

			let prevPropsArg;
			let prevStateArg;
			let curProps;
			let curState;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
					updateState = () => this.setState({
						value: this.state.value + 1
					});
				}
				static getDerivedStateFromProps(props, state) {
					// NOTE: Don't do this in real production code!
					// https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
					return {
						value: state.value + 1
					};
				}
				getSnapshotBeforeUpdate(prevProps, prevState) {
					// These object references might be updated later so copy
					// object so we can assert their values at this snapshot in time
					prevPropsArg = { ...prevProps };
					prevStateArg = { ...prevState };

					curProps = { ...this.props };
					curState = { ...this.state };
				}
				render() {
					return <div>{this.state.value}</div>;
				}
			}

			// Expectation:
			// `prevState` in getSnapshotBeforeUpdate should be
			// the state before setState or getDerivedStateFromProps was called.
			// `this.state` in getSnapshotBeforeUpdate should be
			// the updated state after getDerivedStateFromProps was called.

			// Initial render
			// state.value: initialized to 0 in constructor, 0 -> 1 in gDSFP
			render(<Foo foo="foo" />, scratch);
			const element = scratch.firstChild;

			expect(element.textContent).to.be.equal('1');
			expect(prevPropsArg).to.be.undefined;
			expect(prevStateArg).to.be.undefined;
			expect(curProps).to.be.undefined;
			expect(curState).to.be.undefined;

			// New props
			// state.value: 1 -> 2 in gDSFP
			render(<Foo foo="bar" />, scratch);

			expect(element.textContent).to.be.equal('2');
			expect(prevPropsArg).to.deep.equal({
				foo: 'foo'
			});
			expect(prevStateArg).to.deep.equal({
				value: 1
			});
			expect(curProps).to.deep.equal({
				foo: 'bar'
			});
			expect(curState).to.deep.equal({
				value: 2
			});

			// New state
			// state.value: 2 -> 3 in updateState, 3 -> 4 in gDSFP
			updateState();
			rerender();
			expect(element.textContent).to.be.equal('4');
			expect(prevPropsArg).to.deep.equal({
				foo: 'bar'
			});
			expect(prevStateArg).to.deep.equal({
				value: 2
			});
			expect(curProps).to.deep.equal({
				foo: 'bar'
			});
			expect(curState).to.deep.equal({
				value: 4
			});
		});
	});

	describe('#componentWillUpdate', () => {
		it('should NOT be called on initial render', () => {
			class ReceivePropsComponent extends Component {
				componentWillUpdate() {}
				render() {
					return <div />;
				}
			}
			sinon.spy(ReceivePropsComponent.prototype, 'componentWillUpdate');
			render(<ReceivePropsComponent />, scratch);
			expect(ReceivePropsComponent.prototype.componentWillUpdate).not.to.have.been.called;
		});

		it('should be called when rerender with new props from parent', () => {
			let doRender;
			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			class Inner extends Component {
				componentWillUpdate(nextProps, nextState) {
					expect(nextProps).to.be.deep.equal({ i: 1 });
					expect(nextState).to.be.deep.equal({});
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(Inner.prototype, 'componentWillUpdate');
			sinon.spy(Outer.prototype, 'componentDidMount');

			// Initial render
			render(<Outer />, scratch);
			expect(Inner.prototype.componentWillUpdate).not.to.have.been.called;

			// Rerender inner with new props
			doRender();
			rerender();
			expect(Inner.prototype.componentWillUpdate).to.have.been.called;
		});

		it('should be called on new state', () => {
			let doRender;
			class ReceivePropsComponent extends Component {
				componentWillUpdate() {}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(ReceivePropsComponent.prototype, 'componentWillUpdate');
			render(<ReceivePropsComponent />, scratch);
			expect(ReceivePropsComponent.prototype.componentWillUpdate).not.to.have.been.called;

			doRender();
			rerender();
			expect(ReceivePropsComponent.prototype.componentWillUpdate).to.have.been.called;
		});

		it('should be called after children are mounted', () => {
			let log = [];

			class Inner extends Component {
				componentDidMount() {
					log.push('Inner mounted');

					// Verify that the component is actually mounted when this
					// callback is invoked.
					expect(scratch.querySelector('#inner')).to.equal(this.base);
				}

				render() {
					return <div id="inner" />;
				}
			}

			class Outer extends Component {
				componentDidUpdate() {
					log.push('Outer updated');
				}

				render(props) {
					return props.renderInner ? <Inner /> : <div />;
				}
			}

			const elem = render(<Outer renderInner={false} />, scratch);
			render(<Outer renderInner />, scratch, elem);

			// expect(log).to.deep.equal(['Inner mounted', 'Outer updated']);
		});
	});

	describe('#componentWillMount', () => {
		it('should update state when called setState in componentWillMount', () => {
			let componentState;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
				}
				componentWillMount() {
					this.setState({ value: 1 });
				}
				render() {
					componentState = this.state;
					return <div />;
				}
			}

			render(<Foo />, scratch);

			expect(componentState).to.deep.equal({ value: 1 });
		});
	});

	describe('#componentWillReceiveProps', () => {
		it('should update state when called setState in componentWillReceiveProps', () => {
			let componentState;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						dummy: 0
					};
				}
				componentDidMount() {
					// eslint-disable-next-line react/no-did-mount-set-state
					this.setState({ dummy: 1 });
				}
				render() {
					return <Bar dummy={this.state.dummy} />;
				}
			}
			class Bar extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
				}
				componentWillReceiveProps() {
					this.setState({ value: 1 });
				}
				render() {
					componentState = this.state;
					return <div />;
				}
			}

			render(<Foo />, scratch);
			rerender();

			expect(componentState).to.deep.equal({ value: 1 });

			const cWRP = Foo.prototype.componentWillReceiveProps;
			delete Foo.prototype.componentWillReceiveProps;

			Foo.prototype.shouldComponentUpdate = cWRP;

			render(null, scratch);
			render(<Foo />, scratch);
			rerender();

			expect(componentState, 'via shouldComponentUpdate').to.deep.equal({ value: 1 });

			delete Foo.prototype.shouldComponentUpdate;
			Foo.prototype.componentWillUpdate = cWRP;

			render(null, scratch);
			render(<Foo />, scratch);
			rerender();

			expect(componentState, 'via componentWillUpdate').to.deep.equal({ value: 1 });
		});

		it('should NOT be called on initial render', () => {
			class ReceivePropsComponent extends Component {
				componentWillReceiveProps() {}
				render() {
					return <div />;
				}
			}
			sinon.spy(ReceivePropsComponent.prototype, 'componentWillReceiveProps');
			render(<ReceivePropsComponent />, scratch);
			expect(ReceivePropsComponent.prototype.componentWillReceiveProps).not.to.have.been.called;
		});

		// See last paragraph of cWRP section https://reactjs.org/docs/react-component.html#unsafe_componentwillreceiveprops
		it('should not be called on setState or forceUpdate', () => {
			let spy = sinon.spy();
			let spyInner = sinon.spy();
			let c;

			class Inner extends Component {
				componentWillReceiveProps() {
					spyInner();
				}

				render() {
					return <div>foo</div>;
				}
			}

			class Outer extends Component {
				constructor() {
					super();
					c = this;
				}

				componentWillReceiveProps() {
					spy();
				}

				render() {
					return <Inner />;
				}
			}

			render(<Outer />, scratch);
			expect(spy).to.not.be.called;

			c.setState({});
			rerender();
			expect(spy).to.not.be.called;
			expect(spyInner).to.be.calledOnce;
			spy.resetHistory();
			spyInner.resetHistory();

			c.forceUpdate();
			expect(spy).to.not.be.called;
			expect(spyInner).to.be.calledOnce;
		});

		it('should be called when rerender with new props from parent', () => {
			let doRender;
			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			class Inner extends Component {
				componentWillMount() {
					expect(this.props.i).to.be.equal(0);
				}
				componentWillReceiveProps(nextProps) {
					expect(nextProps.i).to.be.equal(1);
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(Inner.prototype, 'componentWillReceiveProps');
			sinon.spy(Outer.prototype, 'componentDidMount');

			// Initial render
			render(<Outer />, scratch);
			expect(Inner.prototype.componentWillReceiveProps).not.to.have.been.called;

			// Rerender inner with new props
			doRender();
			rerender();
			expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
		});

		it('should be called in right execution order', () => {
			let doRender;
			class Outer extends Component {
				constructor(p, c) {
					super(p, c);
					this.state = { i: 0 };
				}
				componentDidMount() {
					doRender = () => this.setState({ i: this.state.i + 1 });
				}
				render(props, { i }) {
					return <Inner i={i} {...props} />;
				}
			}
			class Inner extends Component {
				componentDidUpdate() {
					expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
					expect(Inner.prototype.componentWillUpdate).to.have.been.called;
				}
				componentWillReceiveProps() {
					expect(Inner.prototype.componentWillUpdate).not.to.have.been.called;
					expect(Inner.prototype.componentDidUpdate).not.to.have.been.called;
				}
				componentWillUpdate() {
					expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
					expect(Inner.prototype.componentDidUpdate).not.to.have.been.called;
				}
				shouldComponentUpdate() {
					expect(Inner.prototype.componentWillReceiveProps).to.have.been.called;
					expect(Inner.prototype.componentWillUpdate).not.to.have.been.called;
					return true;
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(Inner.prototype, 'componentWillReceiveProps');
			sinon.spy(Inner.prototype, 'componentDidUpdate');
			sinon.spy(Inner.prototype, 'componentWillUpdate');
			sinon.spy(Inner.prototype, 'shouldComponentUpdate');
			sinon.spy(Outer.prototype, 'componentDidMount');

			render(<Outer />, scratch);
			doRender();
			rerender();

			expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledBefore(Inner.prototype.componentWillUpdate);
			expect(Inner.prototype.componentWillReceiveProps).to.have.been.calledBefore(Inner.prototype.shouldComponentUpdate);
			expect(Inner.prototype.componentWillUpdate).to.have.been.calledBefore(Inner.prototype.componentDidUpdate);
		});
	});

	describe('#componentDidUpdate', () => {
		it('should be passed previous props and state', () => {

			/** @type {() => void} */
			let updateState;

			let prevPropsArg;
			let prevStateArg;
			let snapshotArg;
			let curProps;
			let curState;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
					updateState = () => this.setState({
						value: this.state.value + 1
					});
				}
				static getDerivedStateFromProps(props, state) {
					// NOTE: Don't do this in real production code!
					// https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
					return {
						value: state.value + 1
					};
				}
				componentDidUpdate(prevProps, prevState, snapshot) {
					// These object references might be updated later so copy
					// object so we can assert their values at this snapshot in time
					prevPropsArg = { ...prevProps };
					prevStateArg = { ...prevState };
					snapshotArg = snapshot;

					curProps = { ...this.props };
					curState = { ...this.state };
				}
				render() {
					return <div>{this.state.value}</div>;
				}
			}

			// Expectation:
			// `prevState` in componentDidUpdate should be
			// the state before setState and getDerivedStateFromProps was called.
			// `this.state` in componentDidUpdate should be
			// the updated state after getDerivedStateFromProps was called.

			// Initial render
			// state.value: initialized to 0 in constructor, 0 -> 1 in gDSFP
			render(<Foo foo="foo" />, scratch);
			expect(scratch.firstChild.textContent).to.be.equal('1');
			expect(prevPropsArg).to.be.undefined;
			expect(prevStateArg).to.be.undefined;
			expect(snapshotArg).to.be.undefined;
			expect(curProps).to.be.undefined;
			expect(curState).to.be.undefined;

			// New props
			// state.value: 1 -> 2 in gDSFP
			render(<Foo foo="bar" />, scratch);
			expect(scratch.firstChild.textContent).to.be.equal('2');
			expect(prevPropsArg).to.deep.equal({ foo: 'foo' });
			expect(prevStateArg).to.deep.equal({ value: 1 });
			expect(snapshotArg).to.be.undefined;
			expect(curProps).to.deep.equal({ foo: 'bar' });
			expect(curState).to.deep.equal({ value: 2 });

			// New state
			// state.value: 2 -> 3 in updateState, 3 -> 4 in gDSFP
			updateState();
			rerender();
			expect(scratch.firstChild.textContent).to.be.equal('4');
			expect(prevPropsArg).to.deep.equal({ foo: 'bar' });
			expect(prevStateArg).to.deep.equal({ value: 2 });
			expect(snapshotArg).to.be.undefined;
			expect(curProps).to.deep.equal({ foo: 'bar' });
			expect(curState).to.deep.equal({ value: 4 });
		});

		it('cDU should not be called when sDU returned false', () => {
			let spy = sinon.spy();
			let c;

			class App extends Component {
				constructor() {
					super();
					c = this;
				}

				shouldComponentUpdate() {
					return false;
				}

				componentDidUpdate(prevProps) {
					spy(prevProps);
				}
			}

			render(<App />, scratch);
			c.setState({});
			rerender();

			expect(spy).to.not.be.called;
		});

		it('prevState argument should be the same object if state doesn\'t change', () => {
			let changeProps, cduPrevState, cduCurrentState;

			class PropsProvider extends Component {
				constructor() {
					super();
					this.state = { value: 0 };
					changeProps = this.changeReceiverProps.bind(this);
				}
				changeReceiverProps() {
					let value = (this.state.value + 1) % 2;
					this.setState({
						value
					});
				}
				render() {
					return <PropsReceiver value={this.state.value} />;
				}
			}

			class PropsReceiver extends Component {
				componentDidUpdate(prevProps, prevState) {
					cduPrevState = prevState;
					cduCurrentState = this.state;
				}
				render({ value }) {
					return <div>{value}</div>;
				}
			}

			render(<PropsProvider />, scratch);

			changeProps();
			rerender();

			expect(cduPrevState).to.equal(cduCurrentState);
		});

		it('prevState argument should be a different object if state does change', () => {
			let updateState, cduPrevState, cduCurrentState;

			class Foo extends Component {
				constructor() {
					super();
					this.state = { value: 0 };
					updateState = this.updateState.bind(this);
				}
				updateState() {
					let value = (this.state.value + 1) % 2;
					this.setState({
						value
					});
				}
				componentDidUpdate(prevProps, prevState) {
					cduPrevState = prevState;
					cduCurrentState = this.state;
				}
				render() {
					return <div>{this.state.value}</div>;
				}
			}

			render(<Foo />, scratch);

			updateState();
			rerender();

			expect(cduPrevState).to.not.equal(cduCurrentState);
		});

		it('prevProps argument should be the same object if props don\'t change', () => {
			let updateState, cduPrevProps, cduCurrentProps;

			class Foo extends Component {
				constructor() {
					super();
					this.state = { value: 0 };
					updateState = this.updateState.bind(this);
				}
				updateState() {
					let value = (this.state.value + 1) % 2;
					this.setState({
						value
					});
				}
				componentDidUpdate(prevProps) {
					cduPrevProps = prevProps;
					cduCurrentProps = this.props;
				}
				render() {
					return <div>{this.state.value}</div>;
				}
			}

			render(<Foo />, scratch);

			updateState();
			rerender();

			expect(cduPrevProps).to.equal(cduCurrentProps);
		});

		it('prevProps argument should be a different object if props do change', () => {
			let changeProps, cduPrevProps, cduCurrentProps;

			class PropsProvider extends Component {
				constructor() {
					super();
					this.state = { value: 0 };
					changeProps = this.changeReceiverProps.bind(this);
				}
				changeReceiverProps() {
					let value = (this.state.value + 1) % 2;
					this.setState({
						value
					});
				}
				render() {
					return <PropsReceiver value={this.state.value} />;
				}
			}

			class PropsReceiver extends Component {
				componentDidUpdate(prevProps) {
					cduPrevProps = prevProps;
					cduCurrentProps = this.props;
				}
				render({ value }) {
					return <div>{value}</div>;
				}
			}

			render(<PropsProvider />, scratch);

			changeProps();
			rerender();

			expect(cduPrevProps).to.not.equal(cduCurrentProps);
		});

		it('is invoked after refs are set', () => {
			const spy = sinon.spy();
			let inst;
			let i = 0;

			class App extends Component {
				componentDidUpdate() {
					expect(spy).to.have.been.calledOnceWith(scratch.firstChild);
				}

				render() {
					let ref = null;

					if (i > 0) {
						// Add ref after mount (i > 0)
						ref = spy;
					}

					i++;
					inst = this;
					return <div ref={ref} />;
				}
			}

			render(<App />, scratch);
			expect(spy).not.to.have.been.called;

			inst.setState({});
			rerender();

			expect(spy).to.have.been.calledOnceWith(scratch.firstChild);
		});
	});

	describe('#componentDidMount', () => {
		it('is invoked after refs are set', () => {
			const spy = sinon.spy();

			class App extends Component {
				componentDidMount() {
					expect(spy).to.have.been.calledOnceWith(scratch.firstChild);
				}

				render() {
					return <div ref={spy} />;
				}
			}

			render(<App />, scratch);
			expect(spy).to.have.been.calledOnceWith(scratch.firstChild);
		});
	});

	describe('top-level componentWillUnmount', () => {
		it('should invoke componentWillUnmount for top-level components', () => {
			class Foo extends Component {
				componentDidMount() {}
				componentWillUnmount() {}
				render() { return 'foo'; }
			}
			class Bar extends Component {
				componentDidMount() {}
				componentWillUnmount() {}
				render() { return 'bar'; }
			}
			spyAll(Foo.prototype);
			spyAll(Bar.prototype);

			render(<Foo />, scratch);
			expect(Foo.prototype.componentDidMount, 'initial render').to.have.been.calledOnce;

			render(<Bar />, scratch);
			expect(Foo.prototype.componentWillUnmount, 'when replaced').to.have.been.calledOnce;
			expect(Bar.prototype.componentDidMount, 'when replaced').to.have.been.calledOnce;

			render(<div />, scratch);
			expect(Bar.prototype.componentWillUnmount, 'when removed').to.have.been.calledOnce;
		});

		it('should only remove dom after componentWillUnmount was called', () => {
			class Foo extends Component {
				componentWillUnmount() {
					expect(document.getElementById('foo')).to.not.equal(null);
				}

				render() {
					return <div id="foo" />;
				}
			}

		 render(<Foo />, scratch);
		 render(null, scratch);
		});
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


	describe('#shouldComponentUpdate', () => {
		let setState;

		class Should extends Component {
			constructor() {
				super();
				this.state = { show: true };
				setState = s => this.setState(s);
			}
			render(props, { show }) {
				return show ? <div /> : null;
			}
		}

		class ShouldNot extends Should {
			shouldComponentUpdate() {
				return false;
			}
		}

		sinon.spy(Should.prototype, 'render');
		sinon.spy(ShouldNot.prototype, 'shouldComponentUpdate');

		beforeEach(() => Should.prototype.render.resetHistory());

		it('should rerender component on change by default', () => {
			render(<Should />, scratch);
			setState({ show: false });
			rerender();

			expect(Should.prototype.render).to.have.been.calledTwice;
		});

		it('should not rerender component if shouldComponentUpdate returns false', () => {
			render(<ShouldNot />, scratch);
			setState({ show: false });
			rerender();

			expect(ShouldNot.prototype.shouldComponentUpdate).to.have.been.calledOnce;
			expect(ShouldNot.prototype.render).to.have.been.calledOnce;
		});

		it('should rerender when sCU returned false before', () => {
			let c;
			let spy = sinon.spy();

			class App extends Component {
				constructor() {
					super();
					c = this;
				}

				shouldComponentUpdate(_, nextState) {
					return !!nextState.update;
				}

				render() {
					spy();
					return <div>foo</div>;
				}
			}

			render(<App />, scratch);

			c.setState({});
			rerender();
			spy.resetHistory();

			c.setState({ update: true });
			rerender();
			expect(spy).to.be.calledOnce;
		});

		it('should be called with nextState', () => {
			let c;
			let spy = sinon.spy();

			class App extends Component {
				constructor() {
					super();
					c = this;
					this.state = { a: false };
				}

				shouldComponentUpdate(_, nextState) {
					return this.state!==nextState;
				}

				render() {
					spy();
					return <div>foo</div>;
				}
			}

			render(<App />, scratch);

			c.setState({});
			rerender();
			spy.resetHistory();

			c.setState({ a: true });
			rerender();
			expect(spy).to.be.calledOnce;
		});

		it('should not be called on forceUpdate', () => {
			let Comp;
			class Foo extends Component {
				constructor() {
					super();
					Comp = this;
				}

				shouldComponentUpdate() {
					return false;
				}

				render() {
					return <ShouldNot />;
				}
			}

			sinon.spy(Foo.prototype, 'shouldComponentUpdate');
			sinon.spy(Foo.prototype, 'render');

			render(<Foo />, scratch);
			Comp.forceUpdate();

			expect(Foo.prototype.shouldComponentUpdate).to.not.have.been.called;
			expect(Foo.prototype.render).to.have.been.calledTwice;
		});

		it('should be passed next props and state', () => {

			/** @type {() => void} */
			let updateState;

			let curProps;
			let curState;
			let nextPropsArg;
			let nextStateArg;

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
					updateState = () => this.setState({
						value: this.state.value + 1
					});
				}
				static getDerivedStateFromProps(props, state) {
					// NOTE: Don't do this in real production code!
					// https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
					return {
						value: state.value + 1
					};
				}
				shouldComponentUpdate(nextProps, nextState) {
					nextPropsArg = { ...nextProps };
					nextStateArg = { ...nextState };

					curProps = { ...this.props };
					curState = { ...this.state };

					return true;
				}
				render() {
					return <div>{this.state.value}</div>;
				}
			}

			// Expectation:
			// `this.state` in shouldComponentUpdate should be
			// the state before setState or getDerivedStateFromProps was called
			// `nextState` in shouldComponentUpdate should be
			// the updated state after getDerivedStateFromProps was called

			// Initial render
			// state.value: initialized to 0 in constructor, 0 -> 1 in gDSFP
			render(<Foo foo="foo" />, scratch);
			expect(scratch.firstChild.textContent).to.be.equal('1');
			expect(curProps).to.be.undefined;
			expect(curState).to.be.undefined;
			expect(nextPropsArg).to.be.undefined;
			expect(nextStateArg).to.be.undefined;

			// New props
			// state.value: 1 -> 2 in gDSFP
			render(<Foo foo="bar" />, scratch);
			expect(scratch.firstChild.textContent).to.be.equal('2');
			expect(curProps).to.deep.equal({ foo: 'foo' });
			expect(curState).to.deep.equal({ value: 1 });
			expect(nextPropsArg).to.deep.equal({ foo: 'bar' });
			expect(nextStateArg).to.deep.equal({ value: 2 });

			// New state
			// state.value: 2 -> 3 in updateState, 3 -> 4 in gDSFP
			updateState();
			rerender();

			expect(scratch.firstChild.textContent).to.be.equal('4');
			expect(curProps).to.deep.equal({ foo: 'bar' });
			expect(curState).to.deep.equal({ value: 2 });
			expect(nextPropsArg).to.deep.equal({ foo: 'bar' });
			expect(nextStateArg).to.deep.equal({ value: 4 });
		});

		it('should update props reference when sCU reutrns false', () => {
			let spy = sinon.spy();

			let updateState;
			class Foo extends Component {
				constructor() {
					super();
					updateState = () => this.setState({});
				}

				shouldComponentUpdate(nextProps) {
					if (nextProps !== this.props) {
						spy();
						return false;
					}
					return true;
				}
			}

			render(<Foo foo="foo" />, scratch);
			render(<Foo foo="bar" />, scratch);
			expect(spy).to.be.calledOnce;

			updateState();
			rerender();

			expect(spy).to.be.calledOnce;
		});

		it('should update state reference when sCU returns false', () => {
			let spy = sinon.spy();

			let updateState;
			class Foo extends Component {
				constructor() {
					super();
					this.state = { foo: 1 };
					updateState = () => this.setState({ foo: 2 });
				}

				shouldComponentUpdate(_, nextState) {
					if (nextState !== this.state) {
						spy(this.state, nextState);
						return false;
					}
					return true;
				}
			}

			render(<Foo />, scratch);
			updateState();
			rerender();

			expect(spy).to.be.calledOnce;
			expect(spy).to.be.calledWithMatch({ foo: 1 }, { foo: 2 });

			updateState();
			rerender();

			expect(spy).to.be.calledWithMatch({ foo: 2 }, { foo: 2 });
			expect(spy).to.be.calledTwice;
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

	describe('#componentDidCatch', () => {
		let receiver;
		class Receiver extends Component {
			constructor() {
				super();
				receiver = this;
			}

			componentDidCatch(error) {
				this.setState({ error });
			}
			render() {
				return <div>{this.state.error ? String(this.state.error) : this.props.children}</div>;
			}
		}

		spyAll(Receiver.prototype);

		beforeEach(() => {
			receiver = undefined;
			resetAllSpies(Receiver.prototype);
		});

		it('should be called when child fails in constructor', () => {
			class ThrowErr extends Component {
				constructor(props, context) {
					super(props, context);
					throw new Error('Error!');
				}
				render() {
					return <div />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			rerender();

			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in componentWillMount', () => {
			class ThrowErr extends Component {
				componentWillMount() {
					throw new Error('Error!');
				}
				render() {
					return <div />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in render', () => {
			// eslint-disable-next-line react/require-render-return
			class ThrowErr extends Component {
				render() {
					throw new Error('Error!');
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in componentDidMount', () => {
			class ThrowErr extends Component {
				componentDidMount() {
					throw new Error('Error!');
				}
				render() {
					return <div />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in getDerivedStateFromProps', () => {
			class ThrowErr extends Component {
				static getDerivedStateFromProps() {
					throw new Error('Error!');
				}
				render() {
					return <span>Should not get here</span>;
				}
			}

			sinon.spy(ThrowErr.prototype, 'render');
			render(<Receiver><ThrowErr /></Receiver>, scratch);

			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
			expect(ThrowErr.prototype.render).not.to.have.been.called;
		});

		it('should be called when child fails in getSnapshotBeforeUpdate', () => {
			class ThrowErr extends Component {
				getSnapshotBeforeUpdate() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			receiver.forceUpdate();

			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in componentDidUpdate', () => {
			class ThrowErr extends Component {
				componentDidUpdate() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);

			receiver.forceUpdate();
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in componentWillUpdate', () => {
			class ThrowErr extends Component {
				componentWillUpdate() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);

			receiver.forceUpdate();
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in componentWillReceiveProps', () => {
			let receiver;
			class Receiver extends Component {
				constructor() {
					super();
					this.state = { foo: 'bar' };
					receiver = this;
				}
				componentDidCatch(error) {
					this.setState({ error });
				}
				render() {
					return <div>{this.state.error ? String(this.state.error) : <ThrowErr foo={this.state.foo} />}</div>;
				}
			}
			class ThrowErr extends Component {
				componentWillReceiveProps() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}
			sinon.spy(Receiver.prototype, 'componentDidCatch');
			render(<Receiver />, scratch);

			receiver.setState({ foo: 'baz' });
			rerender();
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in shouldComponentUpdate', () => {
			let receiver;
			class Receiver extends Component {
				constructor() {
					super();
					this.state = { foo: 'bar' };
					receiver = this;
				}
				componentDidCatch(error) {
					this.setState({ error });
				}
				render() {
					return <div>{this.state.error ? String(this.state.error) : <ThrowErr foo={this.state.foo} />}</div>;
				}
			}

			class ThrowErr extends Component {
				shouldComponentUpdate() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}
			sinon.spy(Receiver.prototype, 'componentDidCatch');
			render(<Receiver />, scratch);
			receiver.setState({ foo: 'baz' });
			rerender();
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child fails in componentWillUnmount', () => {
			class ThrowErr extends Component {
				componentWillUnmount() {
					throw new Error('Error!');
				}
				render() {
					return <div />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			render(<Receiver><div /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when applying a Component ref', () => {
			const Foo = () => <div />;

			class ThrowRef extends Component {
				ref() {
					throw new Error('Error!');
				}

				render() {
					return <Foo ref={this.ref.bind(this)} />;
				}
			}

			render(<Receiver><ThrowRef /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;

			// Flush rerender queue ignoring susbsequent errors thrown by ref
			try {
				rerender();
			}
			catch (e) {}
		});

		it('should be called when applying a DOM ref', () => {
			class ThrowRef extends Component {
				ref() {
					throw new Error('Error!');
				}

				render() {
					return <div ref={this.ref.bind(this)} />;
				}
			}

			render(<Receiver><ThrowRef /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;

			// Flush rerender queue ignoring susbsequent errors thrown by ref
			try {
				rerender();
			}
			catch (e) {}
		});

		it('should be called when unmounting a ref', () => {
			class ThrowRef extends Component {
				ref(value) {
					if (value == null) {
						throw new Error('Error!');
					}
				}

				render() {
					return <div ref={this.ref.bind(this)} />;
				}
			}

			render(<Receiver><ThrowRef /></Receiver>, scratch);
			render(<Receiver><div /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.calledOnce;

			// Flush rerender queue ignoring susbsequent errors thrown by ref
			try {
				rerender();
			}
			catch (e) {}
		});

		it('should be called when functional child fails', () => {
			function ThrowErr() {
				throw new Error('Error!');
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when child inside a Fragment fails', () => {
			function ThrowErr() {
				throw new Error('Error!');
			}

			render(<Receiver><Fragment><ThrowErr /></Fragment></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should re-render with new content', () => {
			class ThrowErr extends Component {
				componentWillMount() {
					throw new Error('Error contents');
				}
				render() {
					return 'No error!?!?';
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			rerender();
			expect(scratch).to.have.property('textContent', 'Error: Error contents');
		});

		it('should be able to adapt and rethrow errors', () => {
			class Adapter extends Component {
				componentDidCatch(error) {
					throw new Error('Adapted ' + String(error && 'message' in error ? error.message : error));
				}
				render() {
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(Adapter.prototype, 'componentDidCatch');
			render((
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>
			), scratch);

			expect(Adapter.prototype.componentDidCatch).to.have.been.called;
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;

			rerender();
			expect(scratch).to.have.property('textContent', 'Error: Adapted Error!');
		});

		it('should bubble on repeated errors', () => {
			class Adapter extends Component {
				componentDidCatch(error) {
					// Try to handle the error
					this.setState({ error });
				}
				render() {
					// But fail at doing so
					if (this.state.error) {
						throw this.state.error;
					}
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(Adapter.prototype, 'componentDidCatch');

			render((
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>
			), scratch);
			rerender();

			expect(Adapter.prototype.componentDidCatch).to.have.been.called;
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should bubble on ignored errors', () => {
			class Adapter extends Component {
				componentDidCatch() {
					// Ignore the error
				}
				render() {
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(Adapter.prototype, 'componentDidCatch');

			render((
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>
			), scratch);
			rerender();

			expect(Adapter.prototype.componentDidCatch).to.have.been.called;
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should not bubble on caught errors', () => {
			class TopReceiver extends Component {
				componentDidCatch(error) {
					this.setState({ error });
				}
				render() {
					return <div>{this.state.error ? String(this.state.error) : this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(TopReceiver.prototype, 'componentDidCatch');

			render((
				<TopReceiver>
					<Receiver>
						<ThrowErr />
					</Receiver>
				</TopReceiver>
			), scratch);
			rerender();

			expect(TopReceiver.prototype.componentDidCatch).not.to.have.been.called;
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should be called through non-component parent elements', () => {
			class ThrowErr extends Component {
				constructor(props, context) {
					super(props, context);
					throw new Error('Error!');
				}
			}

			render(<Receiver><div><ThrowErr /></div></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});

		it('should be called when ref throws', () => {
			function ThrowErr() {
				// eslint-disable-next-line react/jsx-wrap-multilines
				return <div ref={(element) => {
					if (element) {
						throw new Error('Error');
					}
					// eslint-disable-next-line react/jsx-closing-bracket-location
				}} />;
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.prototype.componentDidCatch).to.have.been.called;
		});
	});

	describe('#getDerivedStateFromError', () => {
		let receiver;
		class Receiver extends Component {
			constructor() {
				super();
				receiver = this;
			}

			static getDerivedStateFromError(error) {
				return { error };
			}
			render() {
				return <div>{this.state.error ? String(this.state.error) : this.props.children}</div>;
			}
		}

		spyAll(Receiver.prototype);
		spyAll(Receiver);

		beforeEach(() => {
			receiver = undefined;
			resetAllSpies(Receiver.prototype);
			resetAllSpies(Receiver);
		});

		it('should be called when child fails in constructor', () => {
			class ThrowErr extends Component {
				constructor(props, context) {
					super(props, context);
					throw new Error('Error!');
				}
				render() {
					return <div />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			rerender();

			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		// https://github.com/preactjs/preact/issues/1570
		it('should handle double child throws', () => {
			const Child = ({ i }) => {
				throw new Error(`error! ${i}`);
			};

			const fn = () => render(
				<Receiver>
					{[1, 2].map(i => <Child key={i} i={i} />)}
				</Receiver>,
				scratch
			);
			expect(fn).to.not.throw();

			rerender();
			expect(scratch.innerHTML).to.equal('<div>Error: error! 2</div>');
		});

		it('should be called when child fails in componentWillMount', () => {
			class ThrowErr extends Component {
				componentWillMount() {
					throw new Error('Error!');
				}
				render() {
					return <div />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when child fails in render', () => {
			// eslint-disable-next-line react/require-render-return
			class ThrowErr extends Component {
				render() {
					throw new Error('Error!');
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when child fails in componentDidMount', () => {
			class ThrowErr extends Component {
				componentDidMount() {
					throw new Error('Error!');
				}
				render() {
					return <div />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when child fails in getDerivedStateFromProps', () => {
			class ThrowErr extends Component {
				static getDerivedStateFromProps() {
					throw new Error('Error!');
				}
				render() {
					return <span>Should not get here</span>;
				}
			}

			sinon.spy(ThrowErr.prototype, 'render');
			render(<Receiver><ThrowErr /></Receiver>, scratch);

			expect(Receiver.getDerivedStateFromError).to.have.been.called;
			expect(ThrowErr.prototype.render).not.to.have.been.called;
		});

		it('should be called when child fails in getSnapshotBeforeUpdate', () => {
			class ThrowErr extends Component {
				getSnapshotBeforeUpdate() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			receiver.forceUpdate();

			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when child fails in componentDidUpdate', () => {
			class ThrowErr extends Component {
				componentDidUpdate() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);

			receiver.forceUpdate();
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when child fails in componentWillUpdate', () => {
			class ThrowErr extends Component {
				componentWillUpdate() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);

			receiver.forceUpdate();
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when child fails in componentWillReceiveProps', () => {
			let receiver;
			class Receiver extends Component {
				constructor() {
					super();
					this.state = { foo: 'bar' };
					receiver = this;
				}
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					return <div>{this.state.error ? String(this.state.error) : <ThrowErr foo={this.state.foo} />}</div>;
				}
			}
			class ThrowErr extends Component {
				componentWillReceiveProps() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}
			sinon.spy(Receiver, 'getDerivedStateFromError');
			render(<Receiver />, scratch);

			receiver.setState({ foo: 'baz' });
			rerender();
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when child fails in shouldComponentUpdate', () => {
			let receiver;
			class Receiver extends Component {
				constructor() {
					super();
					this.state = { foo: 'bar' };
					receiver = this;
				}
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					return <div>{this.state.error ? String(this.state.error) : <ThrowErr foo={this.state.foo} />}</div>;
				}
			}

			class ThrowErr extends Component {
				shouldComponentUpdate() {
					throw new Error('Error!');
				}
				render() {
					return <span />;
				}
			}
			sinon.spy(Receiver, 'getDerivedStateFromError');
			render(<Receiver />, scratch);
			receiver.setState({ foo: 'baz' });
			rerender();
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when child fails in componentWillUnmount', () => {
			class ThrowErr extends Component {
				componentWillUnmount() {
					throw new Error('Error!');
				}
				render() {
					return <div />;
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			render(<Receiver><div /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when applying a Component ref', () => {
			const Foo = () => <div />;

			class ThrowRef extends Component {
				ref() {
					throw new Error('Error!');
				}

				render() {
					return <Foo ref={this.ref.bind(this)} />;
				}
			}

			render(<Receiver><ThrowRef /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;

			// Flush rerender queue ignoring susbsequent errors thrown by ref
			try {
				rerender();
			}
			catch (e) {}
		});

		it('should be called when applying a DOM ref', () => {
			class ThrowRef extends Component {
				ref() {
					throw new Error('Error!');
				}

				render() {
					return <div ref={this.ref.bind(this)} />;
				}
			}

			render(<Receiver><ThrowRef /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;

			// Flush rerender queue ignoring susbsequent errors thrown by ref
			try {
				rerender();
			}
			catch (e) {}
		});

		it('should be called when unmounting a ref', () => {
			class ThrowRef extends Component {
				ref(value) {
					if (value == null) {
						throw new Error('Error!');
					}
				}

				render() {
					return <div ref={this.ref.bind(this)} />;
				}
			}

			render(<Receiver><ThrowRef /></Receiver>, scratch);
			render(<Receiver><div /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.calledOnce;

			// Flush rerender queue ignoring susbsequent errors thrown by ref
			try {
				rerender();
			}
			catch (e) {}
		});

		it('should be called when functional child fails', () => {
			function ThrowErr() {
				throw new Error('Error!');
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should re-render with new content', () => {
			class ThrowErr extends Component {
				componentWillMount() {
					throw new Error('Error contents');
				}
				render() {
					return 'No error!?!?';
				}
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			rerender();
			expect(scratch).to.have.property('textContent', 'Error: Error contents');
		});

		it('should be able to adapt and rethrow errors', () => {
			class Adapter extends Component {
				static getDerivedStateFromError(error) {
					throw new Error('Adapted ' + String(error && 'message' in error ? error.message : error));
				}
				render() {
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(Adapter, 'getDerivedStateFromError');
			render((
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>
			), scratch);

			expect(Adapter.getDerivedStateFromError).to.have.been.called;
			expect(Receiver.getDerivedStateFromError).to.have.been.called;

			rerender();
			expect(scratch).to.have.property('textContent', 'Error: Adapted Error!');
		});

		it('should bubble on repeated errors', () => {
			class Adapter extends Component {
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					// But fail at doing so
					if (this.state.error) {
						throw this.state.error;
					}
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(Adapter, 'getDerivedStateFromError');

			render((
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>
			), scratch);
			rerender();

			expect(Adapter.getDerivedStateFromError).to.have.been.called;
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should bubble on ignored errors', () => {
			class Adapter extends Component {
				static getDerivedStateFromError(error) {
					// Ignore the error
					return null;
				}
				render() {
					return <div>{this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(Adapter, 'getDerivedStateFromError');

			render((
				<Receiver>
					<Adapter>
						<ThrowErr />
					</Adapter>
				</Receiver>
			), scratch);
			rerender();

			expect(Adapter.getDerivedStateFromError).to.have.been.called;
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should not bubble on caught errors', () => {
			class TopReceiver extends Component {
				static getDerivedStateFromError(error) {
					return { error };
				}
				render() {
					return <div>{this.state.error ? String(this.state.error) : this.props.children}</div>;
				}
			}

			function ThrowErr() {
				throw new Error('Error!');
			}

			sinon.spy(TopReceiver, 'getDerivedStateFromError');

			render((
				<TopReceiver>
					<Receiver>
						<ThrowErr />
					</Receiver>
				</TopReceiver>
			), scratch);
			rerender();

			expect(TopReceiver.getDerivedStateFromError).not.to.have.been.called;
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
			expect(scratch).to.have.property('textContent', 'Error: Error!');
		});

		it('should be called through non-component parent elements', () => {
			class ThrowErr extends Component {
				constructor(props, context) {
					super(props, context);
					throw new Error('Error!');
				}
			}

			render(<Receiver><div><ThrowErr /></div></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
		});

		it('should be called when ref throws', () => {
			function ThrowErr() {
				// eslint-disable-next-line react/jsx-wrap-multilines
				return <div ref={(element) => {
					if (element) {
						throw new Error('Error');
					}
					// eslint-disable-next-line react/jsx-closing-bracket-location
				}} />;
			}

			render(<Receiver><ThrowErr /></Receiver>, scratch);
			expect(Receiver.getDerivedStateFromError).to.have.been.called;
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
