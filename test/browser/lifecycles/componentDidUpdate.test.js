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
					updateState = () =>
						this.setState({
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

		it("prevState argument should be the same object if state doesn't change", () => {
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

		it("prevProps argument should be the same object if props don't change", () => {
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

		it('should be called after children are mounted', () => {
			let log = [];

			class Inner extends Component {
				componentDidMount() {
					log.push('Inner mounted');

					// Verify that the component is actually mounted when this
					// callback is invoked.
					expect(scratch.querySelector('#inner')).to.equalNode(this.base);
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

			render(<Outer renderInner={false} />, scratch);
			render(<Outer renderInner />, scratch);

			expect(log).to.deep.equal(['Inner mounted', 'Outer updated']);
		});

		it('should be called after parent DOM elements are updated', () => {
			let setValue;
			let outerChildText;

			class Outer extends Component {
				constructor(p, c) {
					super(p, c);

					this.state = { i: 0 };
					setValue = i => this.setState({ i });
				}

				render(props, { i }) {
					return (
						<div>
							<Inner i={i} {...props} />
							<p id="parent-child">Outer: {i}</p>
						</div>
					);
				}
			}

			class Inner extends Component {
				componentDidUpdate() {
					// At this point, the parent's <p> tag should've been updated with the latest value
					outerChildText = scratch.querySelector('#parent-child').textContent;
				}

				render(props, { i }) {
					return <div>Inner: {i}</div>;
				}
			}

			sinon.spy(Inner.prototype, 'componentDidUpdate');

			// Initial render
			render(<Outer />, scratch);
			expect(Inner.prototype.componentDidUpdate).to.not.have.been.called;

			// Set state with a new i
			const newValue = 5;
			setValue(newValue);
			rerender();

			expect(Inner.prototype.componentDidUpdate).to.have.been.called;
			expect(outerChildText).to.equal(`Outer: ${newValue.toString()}`);
		});
	});
});
