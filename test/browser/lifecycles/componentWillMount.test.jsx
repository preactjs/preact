import { createElement, render, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
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

		it('should invoke setState callbacks when setState is called in componentWillMount', () => {
			let componentState;
			let callback = sinon.spy();

			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = {
						value: 0
					};
				}
				componentWillMount() {
					this.setState({ value: 1 }, callback);
					this.setState({ value: 2 }, () => {
						callback();
						this.setState({ value: 3 }, callback);
					});
				}
				render() {
					componentState = this.state;
					return <div />;
				}
			}

			render(<Foo />, scratch);

			expect(componentState).to.deep.equal({ value: 2 });
			expect(callback).to.have.been.calledTwice;

			rerender();

			expect(componentState).to.deep.equal({ value: 3 });
			expect(callback).to.have.been.calledThrice;
		});
	});
});
