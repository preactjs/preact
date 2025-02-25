import { setupRerender } from 'preact/test-utils';
import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

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
		const callback = sinon.spy();

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => expect(callback).to.be.calledOnce)
			.then(() => scheduleEffectAssert(() => expect(callback).to.be.calledOnce))
			.then(() => render(<Comp />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).to.be.calledTwice)
			);
	});

	it('performs the effect only if one of the inputs changed', () => {
		const callback = sinon.spy();

		function Comp(props) {
			useEffect(callback, [props.a, props.b]);
			return null;
		}

		render(<Comp a={1} b={2} />, scratch);

		return scheduleEffectAssert(() => expect(callback).to.be.calledOnce)
			.then(() => render(<Comp a={1} b={2} />, scratch))
			.then(() => scheduleEffectAssert(() => expect(callback).to.be.calledOnce))
			.then(() => render(<Comp a={2} b={2} />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).to.be.calledTwice)
			)
			.then(() => render(<Comp a={2} b={2} />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).to.be.calledTwice)
			);
	});

	it('performs the effect at mount time and never again if an empty input Array is passed', () => {
		const callback = sinon.spy();

		function Comp() {
			useEffect(callback, []);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(callback).to.be.calledOnce;

		return scheduleEffectAssert(() => expect(callback).to.be.calledOnce)
			.then(() => render(<Comp />, scratch))
			.then(() =>
				scheduleEffectAssert(() => expect(callback).to.be.calledOnce)
			);
	});

	it('calls the cleanup function followed by the effect after each render', () => {
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => {
			expect(cleanupFunction).to.be.not.called;
			expect(callback).to.be.calledOnce;
		})
			.then(() => scheduleEffectAssert(() => expect(callback).to.be.calledOnce))
			.then(() => render(<Comp />, scratch))
			.then(() =>
				scheduleEffectAssert(() => {
					expect(cleanupFunction).to.be.calledOnce;
					expect(callback).to.be.calledTwice;
					expect(callback.lastCall.calledAfter(cleanupFunction.lastCall));
				})
			);
	});

	it('cleanups the effect when the component get unmounted if the effect was called before', () => {
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => {
			render(null, scratch);
			rerender();
			expect(cleanupFunction).to.be.calledOnce;
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
