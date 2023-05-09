import React, { useState } from 'react';

const ControlledInputs = () => {
	const [value, set] = useState('');
	const onChange = e => {
		set(e.target.value.slice(0, 3));
	};

	return (
		<div>
			<label>
				Max 3 characters:{' '}
				<input type="text" value={value} onChange={onChange} />
			</label>
		</div>
	);
};

export default ControlledInputs;
