import { setupRerender } from 'preact/test-utils';
import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useReducer } from 'preact/hooks';

/** @jsx createElement */

describe('useReducer', () => {
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

		const initState = { count: 0 };

		function reducer(state, action) {
			switch (action.type) {
				case 'increment':
					return { count: state.count + action.by };
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

	it('can be dispatched by another component', () => {
		const initState = { count: 0 };

		function reducer(state, action) {
			switch (action.type) {
				case 'increment':
					return { count: state.count + action.by };
			}
		}

		function ReducerComponent() {
			const [state, dispatch] = useReducer(reducer, initState);
			return (
				<div>
					<p>Count: {state.count}</p>
					<DispatchComponent dispatch={dispatch} />
				</div>
			);
		}

		function DispatchComponent(props) {
			return (
				<button onClick={() => props.dispatch({ type: 'increment', by: 10 })}>
					Increment
				</button>
			);
		}

		render(<ReducerComponent />, scratch);
		expect(scratch.textContent).to.include('Count: 0');

		const button = scratch.querySelector('button');
		button.click();

		rerender();
		expect(scratch.textContent).to.include('Count: 10');
	});

	it('can lazily initialize its state with an action', () => {
		const states = [];
		let _dispatch;

		function init(initialCount) {
			return { count: initialCount };
		}

		function reducer(state, action) {
			switch (action.type) {
				case 'increment':
					return { count: state.count + action.by };
			}
		}

		function Comp({ initCount }) {
			const [state, dispatch] = useReducer(reducer, initCount, init);
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
