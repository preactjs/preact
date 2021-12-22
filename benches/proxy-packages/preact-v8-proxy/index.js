import { render } from 'preact';

export * from 'preact';

/**
 * @param {HTMLElement} rootDom
 * @returns {{ render(vnode: JSX.Element): void; hydrate(vnode: JSX.Element): void; }}
 */
export function createRoot(rootDom) {
	let result;
	return {
		render(vnode) {
			if (result) {
				result = render(vnode, rootDom, result);
			} else {
				result = render(vnode, rootDom);
			}
		},
		hydrate(vnode) {
			render(vnode, rootDom, rootDom.firstElementChild);
		}
	};
}
