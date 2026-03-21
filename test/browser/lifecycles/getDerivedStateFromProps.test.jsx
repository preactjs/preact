import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../../_util/helpers';

/** @jsx createElement */

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

		it("should update the instance's state with the value returned from getDerivedStateFromProps when props change", () => {
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

		it("should update the instance's state with the value returned from getDerivedStateFromProps when state changes", () => {
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
			expect(logs).to.deep.equal(['child render']);
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
					updateState = () =>
						this.setState({
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
			expect(capturedStates).to.deep.equal([{}, { value: 1 }, { value: 11 }]);
		});
	});
});
