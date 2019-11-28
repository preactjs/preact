/**
 * Normalize event handlers like react does. Most famously it uses `onChange` for any input element.
 * @param {import('./internal').VNode} vnode The vnode to normalize events on
 */
export function applyEventNormalization({ type, props }) {
	if (!props || typeof type != 'string') return;
	let newProps = {};

	for (let i in props) {
		if (/^on(Ani|Tra|Tou)/.test(i)) {
			props[i.toLowerCase()] = props[i];
			delete props[i];
		}
		newProps[i.toLowerCase()] = i;
	}
	if (newProps.ondoubleclick) {
		props.ondblclick = props[newProps.ondoubleclick];
		delete props[newProps.ondoubleclick];
	}
	if (newProps.onbeforeinput) {
		props.onbeforeinput = props[newProps.onbeforeinput];
		delete props[newProps.onbeforeinput];
	}
	// for *textual inputs* (incl textarea), normalize `onChange` -> `onInput`:
	if (
		newProps.onchange &&
		(type === 'textarea' ||
			(type.toLowerCase() === 'input' && !/^fil|che|ra/i.test(props.type)))
	) {
		let normalized = newProps.oninput || 'oninput';
		if (!props[normalized]) {
			props[normalized] = props[newProps.onchange];
			delete props[newProps.onchange];
		}
	}
}
