import { createElement, options, render, Fragment } from 'preact';

/**
 * @param {import('../../src/index').RenderableProps<{ context: any }>} props
 */
function ContextProvider(props) {
	this.getChildContext = () => props.context;
	return props.children;
}

// TODO: Consider using a options._diffed hook to move the children of the
// containerVNode somewhere else after they are diffed to prevent the algorithm
// from trying to insert them. Restore them in an options._diff hook.

/**
 * Portal component
 * @typedef {import('./internal').VNode<any>} VNode
 * @this {import('./internal').Component}
 * @param {{ _vnode: VNode; _container: import('./internal').PreactElement; }} props
 *
 * TODO: use createRoot() instead of fake root
 */
function Portal(props) {
	const _this = this;
	let container = props._container;

	_this.componentWillUnmount = function () {
		render(null, _this._temp);
		_this._temp = null;
		_this._container = null;
	};

	// When we change container we should clear our old container and
	// indicate a new mount.
	if (_this._container && _this._container !== container) {
		_this.componentWillUnmount();
	}

	// When props.vnode is undefined/false/null we are dealing with some kind of
	// conditional vnode. This should not trigger a render.
	if (props._vnode) {
		if (!_this._temp) {
			// Initialize the component

			// To the tree above the Portal, this component doesn't render any DOM
			// nodes (it appears like a Fragment with no DOM children). Doing this
			// causes diffChildren to correctly move children around this Portal and
			// not mess with any of the real DOM this portal is managing.
			//
			// TODO: How can I use mangle config for defining this property?
			Object.defineProperty(_this, '__e', {
				get() {
					return null;
				},
				set() {
					// Should never be set?
					throw new Error('unexpected 🫨');
				}
			});

			_this._container = container;

			// Create a fake DOM parent node that manages a subset of `container`'s children:
			_this._temp = {
				nodeType: 1,
				parentNode: container,
				childNodes: [],
				appendChild(child) {
					this.childNodes.push(child);
					_this._container.appendChild(child);
				},
				insertBefore(child, before) {
					this.childNodes.push(child);
					_this._container.appendChild(child);
				},
				removeChild(child) {
					this.childNodes.splice(this.childNodes.indexOf(child) >>> 1, 1);
					_this._container.removeChild(child);
				}
			};

			// Create a "fake" VNode to represent the container of the Portal's
			// children. It's a "fake" VNode because we make the VNode's _dom property
			// always return our fake DOM parent. This behavior is necessary to ignore
			// the DOM node that Preact will create for this VNode on mount and
			// enables us to use the standard diffing algorithm to manage the children
			// of the Portal.
			_this._containerVNode = /** @type {VNode} */ (
				createElement(container.tagName, null)
			);
			Object.defineProperty(_this._containerVNode, '__e', {
				get() {
					return _this._temp;
				},
				set() {
					// Explicitly ignore the dom element the Preact render creates since
					// we are using a fake one to represent the portal.
				}
			});
		}

		// // Render our wrapping element into temp.
		// render(
		// 	createElement(ContextProvider, { context: _this.context }, props._vnode),
		// 	_this._temp
		// );
	}
	// When we come from a conditional render, on a mounted
	// portal we should clear the DOM.
	else if (_this._temp) {
		_this.componentWillUnmount();
	}

	let tempNode = createElement(Fragment, null);
	_this._containerVNode._original = tempNode._original;
	_this._containerVNode._children = props._vnode;

	return _this._containerVNode;
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').VNode} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to.
 */
export function createPortal(vnode, container) {
	const el = createElement(Portal, { _vnode: vnode, _container: container });
	el.containerInfo = container;
	return el;
}
