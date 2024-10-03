import { render, hydrate } from 'preact';
import { jsx } from 'preact/jsx-runtime';

export * from 'preact';
export * from 'preact/hooks';

export const createElement = (type, props, children) => {
	props.children = children;
	return jsx(type, props, props.key);
};

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
