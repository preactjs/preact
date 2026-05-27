import { setupRerender } from 'preact/test-utils';
import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { vi } from 'vitest';

// Common behaviors between all effect hooks
export function useEffectAssertions(useEffect, scheduleEffectAssert) {
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

	it('performs the effect after every render by default', () => {
		const callback = vi.fn();

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => expect(callback).toHaveBeenCalledOnce())
			.then(() =>
				scheduleEffectAssert(() => expect(callback).toHaveBeenCalledOnce())
			)
			.then(() => render(<Comp />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(2))
			);
	});

	it('performs the effect only if one of the inputs changed', () => {
		const callback = vi.fn();

		function Comp(props) {
			useEffect(callback, [props.a, props.b]);
			return null;
		}

		render(<Comp a={1} b={2} />, scratch);

		return scheduleEffectAssert(() => expect(callback).toHaveBeenCalledOnce())
			.then(() => render(<Comp a={1} b={2} />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).toHaveBeenCalledOnce())
			)
			.then(() => render(<Comp a={2} b={2} />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(2))
			)
			.then(() => render(<Comp a={2} b={2} />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(2))
			);
	});

	it('performs the effect at mount time and never again if an empty input Array is passed', () => {
		const callback = vi.fn();

		function Comp() {
			useEffect(callback, []);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(callback).toHaveBeenCalledOnce();

		return scheduleEffectAssert(() => expect(callback).toHaveBeenCalledOnce())
			.then(() => render(<Comp />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).toHaveBeenCalledOnce())
			);
	});

	it('calls the cleanup function followed by the effect after each render', () => {
		const cleanupFunction = vi.fn();
		const callback = vi.fn(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => {
			expect(cleanupFunction).not.toHaveBeenCalled();
			expect(callback).toHaveBeenCalledOnce();
		})
			.then(() =>
				scheduleEffectAssert(() => expect(callback).toHaveBeenCalledOnce())
			)
			.then(() => render(<Comp />, scratch))
			.then(() =>
				scheduleEffectAssert(() => {
					expect(cleanupFunction).toHaveBeenCalledOnce();
					expect(callback).toHaveBeenCalledTimes(2);
					const callbackLastInvocation =
						callback.mock.invocationCallOrder[
							callback.mock.invocationCallOrder.length - 1
						];
					expect(callbackLastInvocation).to.be.greaterThan(
						cleanupFunction.mock.invocationCallOrder[0]
					);
				})
			);
	});

	it('cleanups the effect when the component get unmounted if the effect was called before', () => {
		const cleanupFunction = vi.fn();
		const callback = vi.fn(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => {
			render(null, scratch);
			rerender();
			expect(cleanupFunction).toHaveBeenCalledOnce();
		});
	});

	it('works with closure effect callbacks capturing props', () => {
		const values = [];

		function Comp(props) {
			useEffect(() => values.push(props.value));
			return null;
		}

		render(<Comp value={1} />, scratch);
		render(<Comp value={2} />, scratch);

		return scheduleEffectAssert(() => expect(values).to.deep.equal([1, 2]));
	});
}
