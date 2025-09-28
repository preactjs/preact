import { setupRerender } from 'preact/test-utils';
import { createElement, render, Component } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';
import { vi } from 'vitest';

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
			vi.spyOn(ForceUpdateComponent.prototype, 'componentWillUpdate');
			vi.spyOn(ForceUpdateComponent.prototype, 'forceUpdate');
			render(<ForceUpdateComponent />, scratch);
			expect(
				ForceUpdateComponent.prototype.componentWillUpdate
			).not.toHaveBeenCalled();

			forceUpdate();
			rerender();

			expect(
				ForceUpdateComponent.prototype.componentWillUpdate
			).toHaveBeenCalled();
			expect(ForceUpdateComponent.prototype.forceUpdate).toHaveBeenCalled();
		});

		it('should add callback to renderCallbacks', () => {
			/** @type {() => void} */
			let forceUpdate;
			let callback = vi.fn();
			class ForceUpdateComponent extends Component {
				componentDidMount() {
					forceUpdate = () => this.forceUpdate(callback);
				}
				render() {
					return <div />;
				}
			}
			vi.spyOn(ForceUpdateComponent.prototype, 'forceUpdate');
			render(<ForceUpdateComponent />, scratch);

			forceUpdate();
			rerender();

			expect(ForceUpdateComponent.prototype.forceUpdate).toHaveBeenCalled();
			expect(ForceUpdateComponent.prototype.forceUpdate).toHaveBeenCalledWith(
				callback
			);
			expect(callback).toHaveBeenCalled();
		});
	});
});
