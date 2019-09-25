import { createElement as h, render, createRef } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createComponent, effect, ref, reactive } from '../../src';
import { nextFrame } from '../_util/nextFrame';

/** @jsx h */

describe('effect', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('call effect', () => {
		const spy = sinon.spy();
		const Comp = createComponent(() => {
			effect(spy);
			return () => null;
		});

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(spy).to.be.calledTwice;
	});

	it('call effect with prop changes', () => {
		const spy = sinon.spy();
		const Comp = createComponent(() => {
			effect(props => props.num, spy);
			return () => null;
		});

		render(<Comp num={1} />, scratch);

		expect(spy).to.be.calledWith(1);

		render(<Comp num={2} />, scratch);

		expect(spy).to.be.calledWith(2);
		expect(spy).to.be.calledTwice;
	});

	it('dont call effect if prop is same', () => {
		const spy = sinon.spy();
		const Comp = createComponent(() => {
			effect(props => props.num, spy);
			return () => null;
		});

		render(<Comp num={1} />, scratch);
		render(<Comp num={1} />, scratch);
		expect(spy).to.be.calledOnce;
	});

	it('call cleanup with prop changes', () => {
		const spy = sinon.spy();
		const Comp = createComponent(() => {
			effect(props => props.num, (n, o, onCleanup) => onCleanup(spy));
			return () => null;
		});

		render(<Comp num={1} />, scratch);
		expect(spy).to.not.be.called;

		render(<Comp num={2} />, scratch);
		expect(spy).to.be.calledOnce;
	});

	it('call effect with multiple prop changes', () => {
		const spy = sinon.spy();
		const Comp = createComponent(() => {
			effect([props => props.x, props => props.y], spy);
			return () => null;
		});

		render(<Comp x={1} y={10} />, scratch);
		render(<Comp x={2} y={10} />, scratch);

		expect(spy).to.be.calledWith([2, 10], [1, 10]);
	});

	it('call effect with ref changes', async () => {
		const spy = sinon.spy();
		let count;
		const Comp = createComponent(() => {
			count = ref(1);
			effect(count, spy);
			return () => null;
		});

		render(<Comp />, scratch);

		expect(spy).to.be.calledWith(1);

		count.value = 2;

		await nextFrame();

		expect(spy).to.be.calledWith(2);
		expect(spy).to.be.calledTwice;
	});

	it('call effect with reactive changes', async () => {
		const spy = sinon.spy();
		let state;
		const Comp = createComponent(() => {
			state = reactive({ count: 1 });
			effect(state, spy);
			return () => null;
		});

		render(<Comp />, scratch);

		expect(spy).to.be.calledWith({ count: 1 });

		state.count = 2;

		await nextFrame();

		expect(spy).to.be.calledWith({ count: 2 });
		expect(spy).to.be.calledTwice;
	});

	it('call effect with DOM refs', async () => {
		const spy = sinon.spy();
		const Comp = createComponent(() => {
			const inputref = createRef(null);
			effect(inputref, spy);
			return () => <input ref={inputref} />;
		});

		render(<Comp />, scratch);

		expect(spy).to.be.calledWith(scratch.firstChild);
	});
});
