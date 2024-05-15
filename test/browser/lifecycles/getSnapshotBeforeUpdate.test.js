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
						`getSnapshotBeforeUpdate() prevProps:${prevProps.value} prevState:${prevState.value}`
					);
					return 'abc';
				}
				componentDidUpdate(prevProps, prevState, snapshot) {
					log.push(
						`componentDidUpdate() prevProps:${prevProps.value} prevState:${prevState.value} snapshot:${snapshot}`
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
					expect(this.divRef.textContent).to.equal(`value:${prevProps.value}`);
					return 'foobar';
				}
				componentDidUpdate(prevProps, prevState, snapshot) {
					log.push('componentDidUpdate');
					expect(this.divRef.textContent).to.equal(`value:${this.props.value}`);
					expect(snapshot).to.equal('foobar');
				}
				render() {
					log.push('render');
					return (
						<div
							ref={ref => (this.divRef = ref)}
						>{`value:${this.props.value}`}</div>
					);
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
});
