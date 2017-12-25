import { createElement, cloneElement, Component, render } from 'ceviche';
// const ATTRS_DESCRIPTOR = {
// 	get() {
// 		return this.props;
// 	}
// };
// export function h(...args) {
// 	let vnode = createElement(...args);
// 	Object.defineProperty(vnode, 'attributes', ATTRS_DESCRIPTOR);
// 	return vnode;
// }
// export function h(...args) {
// 	let el = createElement(...args);
// 	console.log(args, el);
// 	return el;
// }
export { createElement as h, createElement, cloneElement, Component, render };
