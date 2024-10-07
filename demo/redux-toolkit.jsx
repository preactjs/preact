import { createElement } from 'preact';
import { Provider, useSelector } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';

const initialState = {
	value: 0
};
const counterSlice = createSlice({
	name: 'counter',
	initialState,
	reducers: {
		increment: state => {
			state.value += 1;
		},
		decrement: state => {
			state.value -= 1;
		}
	}
});
const store = configureStore({
	reducer: {
		counter: counterSlice.reducer
	}
});

function Counter({ number }) {
	const count = useSelector(state => state.counter.value);
	return (
		<div>
			Counter #{number}:{count}
		</div>
	);
}

export default function ReduxToolkit() {
	function increment() {
		store.dispatch(counterSlice.actions.increment());
	}
	function decrement() {
		store.dispatch(counterSlice.actions.decrement());
	}
	function incrementAsync() {
		setTimeout(() => {
			store.dispatch(counterSlice.actions.increment());
		}, 1000);
	}
	return (
		<Provider store={store}>
			<div>
				<h1>Redux Toolkit</h1>
				<h1>Counter</h1>
				<Counter number={1} />
				<Counter number={2} />
				<button onClick={increment}>+</button>
				<button onClick={decrement}>-</button>
				<button onClick={incrementAsync}>Increment Async</button>
			</div>
		</Provider>
	);
}
