import { createElement, render } from 'preact';
import { useState } from 'preact/hooks';

	const App = () => {
		const [value, setValue] = useState('');

		return <input value={value} onInput={e => {
			if (e.target.value.length >= 3) {
				return;
			}
			setValue(e.target.value)
		}} />
	}

render(<App />, document.body);
