import React, { useState } from 'react';
import TextField from '@material-ui/core/TextField';

/** @jsx React.createElement */

const PatchedTextField = props => {
	const [value, set] = useState(props.value);
	return (
		<TextField {...props} value={value} onChange={e => set(e.target.value)} />
	);
};

const TextFields = () => (
	<div>
		<TextField
			variant="outlined"
			margin="normal"
			fullWidth
			label="Cannot type in"
		/>
		<PatchedTextField
			variant="outlined"
			margin="normal"
			fullWidth
			label="I can"
		/>
		<TextField
			defaultValue="Reset after blur or empty"
			variant="outlined"
			margin="normal"
			fullWidth
			label="default value"
		/>
	</div>
);

export default TextFields;
