import { createElement } from "preact";
import { createComponent, watch } from "preact/composition";
import { ThemeCtx } from "./utils/ctx";

export default createComponent(() => {
	const theme = watch(ThemeCtx);

	return () => {
		return (
			<div style={theme.value.style}>
				<p>Hello everyone</p>
				<button onClick={theme.value.invert}>invert</button>
			</div>
		);
	};
});
