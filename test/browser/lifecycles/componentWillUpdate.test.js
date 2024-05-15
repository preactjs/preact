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
			expect(ReceivePropsComponent.prototype.componentWillUpdate).not.to.have
				.been.called;
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
			expect(ReceivePropsComponent.prototype.componentWillUpdate).not.to.have
				.been.called;

			doRender();
			rerender();
			expect(ReceivePropsComponent.prototype.componentWillUpdate).to.have.been
				.called;
		});
	});
});
