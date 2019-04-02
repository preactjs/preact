import { setupRerender } from 'preact/test-utils';
import { createElement as h, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useState, useReducer, useEffect, useLayoutEffect, useRef } from '../../src';
import { scheduleEffectAssert } from '../_util/useEffectUtil';

/** @jsx h */


describe('combinations', () => {

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


	it('can mix useState hooks', () => {
		const states = {};
		const setStates = {};

		function Parent() {
			const [state1, setState1] = useState(1);
			const [state2, setState2] = useState(2);

			Object.assign(states, { state1, state2 });
			Object.assign(setStates, { setState1, setState2 });

			return <Child />;
		}

		function Child() {
			const [state3, setState3] = useState(3);
			const [state4, setState4] = useState(4);

			Object.assign(states, { state3, state4 });
			Object.assign(setStates, { setState3, setState4 });

			return null;
		}

		render(<Parent />, scratch);
		expect(states).to.deep.equal({ state1: 1, state2: 2, state3: 3, state4: 4 });

		setStates.setState2(n => n * 10);
		setStates.setState3(n => n * 10);
		rerender();
		expect(states).to.deep.equal({ state1: 1, state2: 20, state3: 30, state4: 4 });
	});

	it('can rerender asynchronously from within an effect', () => {
		const didRender = sinon.spy();

		function Comp() {
			const [counter, setCounter] = useState(0);

			useEffect(() => { if (counter === 0) setCounter(1); });

			didRender(counter);
			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => {
			rerender();
			expect(didRender).to.have.been.calledTwice.and.calledWith(1);
		});
	});

	it('can rerender synchronously from within a layout effect', () => {
		const didRender = sinon.spy();

		function Comp() {
			const [counter, setCounter] = useState(0);

			useLayoutEffect(() => { if (counter === 0) setCounter(1); });

			didRender(counter);
			return null;
		}

		render(<Comp />, scratch);
		rerender();

		expect(didRender).to.have.been.calledTwice.and.calledWith(1);
	});

	it('can access refs from within a layout effect callback', () => {
		let refAtLayoutTime;

		function Comp() {
			const input = useRef();

			useLayoutEffect(() => {
				refAtLayoutTime = input.current;
			});

			return <input ref={input} value="hello" />;
		}

		render(<Comp />, scratch);

		expect(refAtLayoutTime.value).to.equal('hello');
	});

	it('can use multiple useState and useReducer hooks', () => {
		let states = [];
		let dispatchState4;

		function reducer1(state, action) {
			switch (action.type) {
				case 'increment': return state + action.count;
			}
		}

		function reducer2(state, action) {
			switch (action.type) {
				case 'increment': return state + action.count * 2;
			}
		}

		function Comp() {
			const [state1] = useState(0);
			const [state2] = useReducer(reducer1, 10);
			const [state3] = useState(1);
			const [state4, dispatch] = useReducer(reducer2, 20);

			dispatchState4 = dispatch;
			states.push(state1, state2, state3, state4);

			return null;
		}

		render(<Comp />, scratch);

		expect(states).to.deep.equal([0, 10, 1, 20]);

		states = [];

		dispatchState4({ type: 'increment', count: 10 });
		rerender();

		expect(states).to.deep.equal([0, 10, 1, 40]);
	});

	it('ensures useEffect always schedule after the next paint following a redraw effect, when using the default debounce strategy', () => {
		let effectCount = 0;

		function Comp() {
			const [counter, setCounter] = useState(0);

			useEffect(() => {
				if (counter === 0) setCounter(1);
				effectCount++;
			});

			return null;
		}

		render(<Comp />, scratch);

		return scheduleEffectAssert(() => {
			expect(effectCount).to.equal(1);
		});
	});
});
