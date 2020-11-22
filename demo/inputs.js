import { createElement } from 'preact';
import { useState } from 'preact/hooks';

const Input = () => {
	const [value, setValue] = useState('');

	const onInput = e => {
		if (e.target.value.length > 3) {
			return;
		}
		setValue(e.target.value);
	};

	return <input value={value} onInput={onInput} />;
};

const CheckBox = () => {
	const [value, setValue] = useState(true);

	const onInput = e => {
		if (e.target.value.length === false) {
			return;
		}
		setValue(e.target.value);
	};

	return <input type="checkbox" checked={value} onInput={onInput} />;
};

const Inputs = () => (
	<div>
		<Input />
		<CheckBox />
	</div>
);

export default Inputs;
