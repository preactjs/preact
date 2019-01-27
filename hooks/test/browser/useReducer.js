import { createElement as h, render } from 'preact';
import { setupScratch, teardown, setupRerender } from '../../../test/_util/helpers';
import { useReducer } from '../../src';

/** @jsx h */


xdescribe('useReducer', () => {

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


	it('rerenders when dispatching an action', () => {
		const states = [];
		let _dispatch;

		const initState = { count: 0 }

		function reducer(state, action) {
			switch (action.type) {
				case 'increment': return { count: state.count + action.by };
			}
		}

		function Comp() {
			const [state, dispatch] = useReducer(reducer, initState);
			_dispatch = dispatch;
			states.push(state);
			return null;
		}

		render(<Comp />, scratch);

		_dispatch({ type: 'increment', by: 10 });
		rerender();

		expect(states).to.deep.equal([{ count: 0 }, { count: 10 }]);
	});

	it('can lazily initialize its state with an action', () => {
		const states = [];
		let _dispatch;

		const initState = { count: 0 }

		function reducer(state, action) {
			switch (action.type) {
				case 'init': return { count: action.count };
				case 'increment': return { count: state.count + action.by };
			}
		}

		function Comp({ initCount }) {
			const [state, dispatch] = useReducer(reducer, initState, { type: 'init', count: initCount });
			_dispatch = dispatch;
			states.push(state);
			return null;
		}

		render(<Comp initCount={10} />, scratch);

		_dispatch({ type: 'increment', by: 10 });
		rerender();

		expect(states).to.deep.equal([{ count: 10 }, { count: 20 }]);
	});

});
