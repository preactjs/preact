import { createElement } from 'preact';
import { createComponent, inject } from 'preact/composition';

export default createComponent(() => {
	const style = inject('theme:style');
	const invert = inject('theme:invert');

	return () => {
		return (
			<div style={style.$value}>
				<p>Hello everyone</p>
				<button onClick={invert}>invert</button>
			</div>
		);
	};
});
