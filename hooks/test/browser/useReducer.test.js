import { setupRerender, act } from 'preact/test-utils';
import { createElement, render, createContext } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useReducer, useEffect, useContext } from 'preact/hooks';

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

	it('provides a stable reference for dispatch', () => {
		const dispatches = [];
		let _dispatch;

		const initState = { count: 0 };

		function reducer(state, action) {
			switch (action.type) {
				case 'increment':
					return { count: state.count + action.by };
			}
		}

		function Comp() {
			const [, dispatch] = useReducer(reducer, initState);
			_dispatch = dispatch;
			dispatches.push(dispatch);
			return null;
		}

		render(<Comp />, scratch);

		_dispatch({ type: 'increment', by: 10 });
		rerender();

		expect(dispatches[0]).to.equal(dispatches[1]);
	});

	it('uses latest reducer', () => {
		const states = [];
		let _dispatch;

		const initState = { count: 0 };

		function Comp({ increment }) {
			const [state, dispatch] = useReducer(function(state, action) {
				switch (action.type) {
					case 'increment':
						return { count: state.count + increment };
				}
			}, initState);
			_dispatch = dispatch;
			states.push(state);
			return null;
		}

		render(<Comp increment={10} />, scratch);

		render(<Comp increment={20} />, scratch);

		_dispatch({ type: 'increment' });
		rerender();

		expect(states).to.deep.equal([{ count: 0 }, { count: 0 }, { count: 20 }]);
	});

	// Relates to #2549
	it('should not mutate the hookState', () => {
		const reducer = (state, action) => ({
			...state,
			innerMessage: action.payload
		});

		const ContextMessage = ({ context }) => {
			const [{ innerMessage }, dispatch] = useContext(context);
			useEffect(() => {
				dispatch({ payload: 'message' });
			}, []);

			return innerMessage && <p>{innerMessage}</p>;
		};

		const Wrapper = ({ children }) => <div>{children}</div>;

		const badContextDefault = {};
		const BadContext = createContext({});

		const Abstraction = ({ reducer, defaultState, children }) => (
			<BadContext.Provider value={useReducer(reducer, defaultState)}>
				<Wrapper>{children}</Wrapper>
			</BadContext.Provider>
		);

		const App = () => (
			<Abstraction reducer={reducer} defaultState={badContextDefault}>
				<ContextMessage context={BadContext} />
			</Abstraction>
		);

		act(() => {
			render(<App />, scratch);
		});
		expect(scratch.innerHTML).to.equal('<div><p>message</p></div>');
	});
});
