import { createElement } from 'preact';
import create from 'zustand';

const useStore = create(set => ({
	value: 0,
	text: 'John',
	setText: text => set(state => ({ ...state, text })),
	increment: () => set(state => ({ value: state.value + 1 })),
	decrement: () => set(state => ({ value: state.value - 1 })),
	incrementAsync: async () => {
		await new Promise(resolve => setTimeout(resolve, 1000));
		set(state => ({ value: state.value + 1 }));
	}
}));

function Counter({ number }) {
	const value = useStore(state => state.value);
	return (
		<div>
			Counter #{number}: {value}
		</div>
	);
}
function Text() {
	const text = useStore(state => state.text);
	const { setText } = useStore();
	function handleInput(e) {
		setText(e.target.value);
	}
	return (
		<div>
			Text: {text}
			<input value={text} onInput={handleInput} />
		</div>
	);
}

export default function ZustandComponent() {
	const { increment, decrement, incrementAsync } = useStore();

	return (
		<div>
			<h1>Zustand</h1>
			<h1>Counter</h1>
			<Counter number={1} />
			<Counter number={2} />
			<button onClick={increment}>+</button>
			<button onClick={decrement}>-</button>
			<button onClick={incrementAsync}>Increment Async</button>
			<Text />
		</div>
	);
}
