import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component } from '../../../src/index';
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
});
