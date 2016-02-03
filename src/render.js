import build from './vdom/build';
import { deepHook } from './hooks';

/** Render JSX into a `parent` Element.
 *	@param {VNode} vnode		A (JSX) VNode to render
 *	@param {Element} parent		DOM element to render into
 *	@param {Element} [merge]	Attempt to re-use an existing DOM tree rooted at `merge`
 *	@public
 *
 *	@example
 *	// render a div into <body>:
 *	render(<div id="hello">hello!</div>, document.body);
 *
 *	@example
 *	// render a "Thing" component into #foo:
 *	const Thing = ({ name }) => <span>{ name }</span>;
 *	render(<Thing name="one" />, document.querySelector('#foo'));
 */
export default function render(vnode, parent, merge) {
	let existing = merge && merge._component && merge._componentConstructor===vnode.nodeName,
		built = build(merge, vnode),
		c = !existing && built._component;

	if (c) deepHook(c, 'componentWillMount');

	if (built.parentNode!==parent) {
		parent.appendChild(built);
	}

	if (c) deepHook(c, 'componentDidMount');

	return built;
}
