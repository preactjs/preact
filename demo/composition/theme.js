import { createElement } from 'preact';
import { createComponent, watch, getContext } from 'preact/composition';
import { ThemeCtx } from './utils/ctx';

export default createComponent(() => {
	const theme = getContext('theme');

	return () => {
		return (
			<div style={theme.style}>
				<p>Hello everyone</p>
				<button onClick={theme.invert}>invert</button>
			</div>
		);
	};
});
