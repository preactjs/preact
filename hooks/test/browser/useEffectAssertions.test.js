import { setupRerender } from 'preact/test-utils';
import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';


/** @jsx h */

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
		const callback = jasmine.createSpy('callback');

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(1))
			.then(() => scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(1)))
			.then(() => render(<Comp />, scratch))
			.then(() => scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(2)));
	});

	it('performs the effect only if one of the inputs changed', () => {
		const callback = jasmine.createSpy('callback');

		function Comp(props) {
			useEffect(callback, [props.a, props.b]);
			return null;
		}

		render(<Comp a={1} b={2} />, scratch);

		return scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(1))
			.then(() => render(<Comp a={1} b={2} />, scratch))
			.then(() => scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(1)))
			.then(() => render(<Comp a={2} b={2} />, scratch))
			.then(() => scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(2)))
			.then(() => render(<Comp a={2} b={2} />, scratch))
			.then(() => scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(2)));
	});

	it('performs the effect at mount time and never again if an empty input Array is passed', () => {
		const callback = jasmine.createSpy('callback');

		function Comp() {
			useEffect(callback, []);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(callback).toHaveBeenCalledTimes(1);

		return scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(1))
			.then(() => render(<Comp />, scratch))
			.then(() => scheduleEffectAssert(() => expect(callback).toHaveBeenCalledTimes(1)));
	});

	it('calls the cleanup function followed by the effect after each render', () => {
		const cleanupFunction = jasmine.createSpy('cleanup');
		const callback = jasmine.createSpy('callback').and.callFake(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => {
			expect(cleanupFunction).not.toHaveBeenCalled();
			expect(callback).toHaveBeenCalledTimes(1);
			callback.calls.reset();
			cleanupFunction.calls.reset();
		})
			.then(() => scheduleEffectAssert(() => {
				expect(cleanupFunction).not.toHaveBeenCalled();
				expect(callback).not.toHaveBeenCalled();
				callback.calls.reset();
				cleanupFunction.calls.reset();
			}))
			.then(() => render(<Comp />, scratch))
			.then(() => scheduleEffectAssert(() => {
				expect(cleanupFunction).toHaveBeenCalled();
				expect(callback).toHaveBeenCalled();
				expect(cleanupFunction).toHaveBeenCalledBefore(callback);
			}));
	});

	it('cleanups the effect when the component get unmounted if the effect was called before', () => {
		const cleanupFunction = jasmine.createSpy('cleanup');
		const callback = jasmine.createSpy('callback').and.callFake(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => {
			render(null, scratch);
			rerender();
			expect(cleanupFunction).toHaveBeenCalledTimes(1);
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

		return scheduleEffectAssert(() => expect(values).toEqual([1, 2]));
	});
}
