import { createElement, render, Component } from '../../../src/index';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../_util/helpers';

/** @jsx createElement */

describe('Lifecycle methods', () => {

	/** @type {HTMLDivElement} */
	let scratch;
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
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

		it('should call setState callback in componentWillMount', () => {
			let componentState;
			let spy = sinon.spy();

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
				}
				componentWillMount() {
					this.setState({ value: 1 }, spy);
				}
				render() {
					componentState = this.state;
					return <div />;
				}
			}

			render(<Foo />, scratch);

			expect(spy).to.be.calledOnce;
			expect(componentState).to.deep.equal({ value: 1 });
		});

		it.skip('should call setState callback in correct order', () => {
			let callOrder = [];

			class A extends Component {
				componentWillMount() {
					callOrder.push('willMount');
					this.setState(
						{
							a: 'a'
						},
						() => {
							callOrder.push('willMountCb');
						}
					);
				}
				render() {
					return <B />;
				}
			}

			class B extends Component {
				render() {
					return <div>B</div>;
				}
				componentDidMount() {
					callOrder.push('didMount');
				}
			}

			render(<A />, scratch);
			rerender();

			expect(callOrder).to.deep.equal(['willMount', 'didMount', 'willMountCb']);
		});
	});
});
