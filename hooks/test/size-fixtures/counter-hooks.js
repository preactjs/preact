import { createElement, render } from '../../../';
import { useState } from '../../';

/* @jsx createElement */

function App() {
	const [count, setCount] = useState(0);
	return (
		<button
			class="btn badge"
			data-badge={count}
			style="margin-top: .5rem"
			onClick={() => setCount(count + 1)}
		>
			count: {count}
		</button>
	);
}

render(<App />, document.getElementById('app'));
