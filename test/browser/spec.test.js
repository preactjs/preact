import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('Component spec', () => {
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('forceUpdate', () => {
		it('should force a rerender', () => {
			/** @type {() => void} */
			let forceUpdate;
			class ForceUpdateComponent extends Component {
				componentWillUpdate() {}
				componentDidMount() {
					forceUpdate = () => this.forceUpdate();
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(ForceUpdateComponent.prototype, 'componentWillUpdate');
			sinon.spy(ForceUpdateComponent.prototype, 'forceUpdate');
			render(<ForceUpdateComponent />, scratch);
			expect(ForceUpdateComponent.prototype.componentWillUpdate).not.to.have
				.been.called;

			forceUpdate();
			rerender();

			expect(ForceUpdateComponent.prototype.componentWillUpdate).to.have.been
				.called;
			expect(ForceUpdateComponent.prototype.forceUpdate).to.have.been.called;
		});

		it('should add callback to renderCallbacks', () => {
			/** @type {() => void} */
			let forceUpdate;
			let callback = sinon.spy();
			class ForceUpdateComponent extends Component {
				componentDidMount() {
					forceUpdate = () => this.forceUpdate(callback);
				}
				render() {
					return <div />;
				}
			}
			sinon.spy(ForceUpdateComponent.prototype, 'forceUpdate');
			render(<ForceUpdateComponent />, scratch);

			forceUpdate();
			rerender();

			expect(ForceUpdateComponent.prototype.forceUpdate).to.have.been.called;
			expect(
				ForceUpdateComponent.prototype.forceUpdate
			).to.have.been.calledWith(callback);
			expect(callback).to.have.been.called;
		});
	});
});
