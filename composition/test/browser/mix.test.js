import { createElement, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, value, onMounted, onUnmounted } from '../../src';
import { nextFrame } from '../_util/nextFrame';

/** @jsx createElement */

describe('hooks and composition', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('useState and value together', async () => {
		const Comp = createComponent(() => {
			const countRef = value(0);
			function incrementRef() {
				countRef.value++;
			}
			return () => {
				const [countHooks, setCountHooks] = useState(0);
				function incrementHooks() {
					setCountHooks(countHooks + 1);
				}
				return (
					<div>
						<button onClick={incrementRef}>{countRef.value}</button>
						<button onClick={incrementHooks}>{countHooks}</button>
					</div>
				);
			};
		});

		render(<Comp />, scratch);

		const [cBtn, hBtn] = scratch.firstElementChild.children;

		expect(cBtn.textContent).to.equal('0');
		expect(hBtn.textContent).to.equal('0');

		cBtn.click();
		await nextFrame();

		expect(cBtn.textContent).to.equal('1');
		expect(hBtn.textContent).to.equal('0');

		hBtn.click();
		await nextFrame();

		expect(cBtn.textContent).to.equal('1');
		expect(hBtn.textContent).to.equal('1');
	});

	it('call onMounted and onUnmounted and useEffect', () => {
		const spyMounted = sinon.spy();
		const spyUnmounted = sinon.spy();
		const spyEffect = sinon.spy();
		const spyCleanup = sinon.spy();

		const Comp = createComponent(() => {
			onMounted(spyMounted);
			onUnmounted(spyUnmounted);

			return () => {
				useEffect(() => {
					spyEffect();
					return () => spyCleanup();
				}, []);
				return null;
			};
		});

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(spyMounted).to.be.calledOnce;
		expect(spyUnmounted).to.not.be.called;
		expect(spyEffect).to.be.calledOnce;
		expect(spyCleanup).to.not.be.called;

		render(null, scratch);

		expect(spyUnmounted).to.be.called;
		expect(spyCleanup).to.be.calledOnce;
	});
});
