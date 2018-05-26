import { diff } from './vdom/diff';

/**
 * Render JSX into a `parent` Element.
 * @param {import('./vnode').VNode} vnode A (JSX) VNode to render
 * @param {import('./dom').PreactElement} parent DOM element to render into
 * @param {import('./dom').PreactElement} [merge] Attempt to re-use an existing DOM tree rooted at
 *  `merge`
 * @public
 *
 * @example
 * // render a div into <body>:
 * render(<div id="hello">hello!</div>, document.body);
 *
 * @example
 * // render a "Thing" component into #foo:
 * const Thing = ({ name }) => <span>{ name }</span>;
 * render(<Thing name="one" />, document.querySelector('#foo'));
 */
export function render(vnode, parent, merge) {
	return diff(merge, vnode, {}, false, parent, false);
}
