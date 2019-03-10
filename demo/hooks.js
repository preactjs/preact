import { createElement } from 'preact';
import { useState } from 'preact/hooks';

function StateComponent() {
	let [v, setter] = useState(0);
	return (
		<div>
			value: {v}
			<button onClick={() => setter(++v)}>click</button>
		</div>
	);
}

export default function Hooks() {
	return (
		<div>
			<StateComponent />
		</div>
	);
}
