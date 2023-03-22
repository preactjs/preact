import { render, hydrate } from 'preact';

export * from 'preact/hooks';
export * from 'preact';

/**
 * @param {HTMLElement} rootDom
 * @returns {{ render(vnode: JSX.Element): void; hydrate(vnode: JSX.Element): void; }}
 */
export function createRoot(rootDom) {
	return {
		render(vnode) {
			render(vnode, rootDom);
		},
		hydrate(vnode) {
			hydrate(vnode, rootDom);
		}
	};
}
