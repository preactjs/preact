import { createElement as h, render } from 'preact';
import { spy } from 'sinon';
import { setupScratch, teardown, setupRerender } from '../../../test/_util/helpers';
import { useState, useEffect, useLayoutEffect, useRef } from '../../src';
import { scheduleEffectAssert } from './useEffectUtil';

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

	it('can rerender asynchronously from within an effect', done => {
		const didRender = spy();

		function Comp() {
			const [counter, setCounter] = useState(0);

			useEffect(() => { if (counter === 0) setCounter(1) });

			didRender(counter);
			return null;
		}

		render(<Comp/>, scratch);

		scheduleEffectAssert(() => {
			rerender();
			expect(didRender).to.have.been.calledTwice.and.calledWith(1)
		})
		.then(done)
		.catch(done);
	});

	it('can rerender synchronously from within a layout effect', () => {
		const didRender = spy();

		function Comp() {
			const [counter, setCounter] = useState(0);

			useLayoutEffect(() => { if (counter === 0) setCounter(1) });

			didRender(counter);
			return null;
		}

		render(<Comp/>, scratch);

		expect(didRender).to.have.been.calledTwice.and.calledWith(1)
	});

	it('can access refs from within a layout effect callback', () => {
		let refAtLayoutTime;

		function Comp() {
			const input = useRef();

			useLayoutEffect(() => {
				refAtLayoutTime = input.current;
			});

			return <input ref={ input } value="hello" />;
		}

		render(<Comp/>, scratch);

		expect(refAtLayoutTime.value).to.equal('hello');
	});

});