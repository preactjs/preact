import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, onMounted, onUnmounted, effect } from '../../src';

/** @jsx h */

describe('lifecycle', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('call onMounted and onUnmounted', () => {
		const spyMounted = sinon.spy();
		const spyUnmounted = sinon.spy();
		const spyEffect = sinon.spy();

		const Comp = createComponent(() => {
			onMounted(spyMounted);
			effect(spyEffect);
			onUnmounted(spyUnmounted);
			return () => null;
		});

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(spyMounted).to.be.calledOnce;
		expect(spyEffect).to.be.calledTwice;
		expect(spyUnmounted).to.not.be.called;

		render(null, scratch);

		expect(spyMounted).to.be.calledOnce;
		expect(spyEffect).to.be.calledTwice;
		expect(spyUnmounted).to.be.called;
	});
});
