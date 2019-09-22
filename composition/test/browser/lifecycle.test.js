import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, onMounted, onUnmounted } from '../../src';

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
		const Comp = createComponent(() => {
			onMounted(spyMounted);
			onUnmounted(spyUnmounted);
			return () => null;
		});

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(spyMounted).to.be.calledOnce;
		expect(spyUnmounted).to.not.be.called;

		render(null, scratch);

		expect(spyUnmounted).to.be.called;
	});
});
