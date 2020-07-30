import { createElement, hydrate, render, __u as _unmount } from 'preact';

function ContextProvider(props) {
	this.getChildContext = () => props.context;
	return props.children;
}

/**
 * Portal component
 * @param {object | null | undefined} props
 *
 * TODO: this could use the "fake root node" trick from the partial hydration demo
 */
function Portal(props) {
	let container = props._container;
	let wrap = createElement(
		ContextProvider,
		{ context: this.context },
		props._vnode
	);

	this.componentWillUnmount = function() {
		let parent = this._temp.parentNode;
		if (parent) parent.removeChild(this._temp);
		_unmount(this._wrap);
	};

	// When we change container we should clear our old container and
	// indicate a new mount.
	if (this._container && this._container !== container) {
		this.componentWillUnmount();
		// if (this._temp.parentNode) this._container.removeChild(this._temp);
		// _unmount(this._wrap);
		this._hasMounted = false;
	}

	// When props.vnode is undefined/false/null we are dealing with some kind of
	// conditional vnode. This should not trigger a render.
	if (props._vnode) {
		if (!this._hasMounted) {
			// Create a placeholder that we can use to insert into.
			this._temp = document.createTextNode('');
			// Hydrate existing nodes to keep the dom intact, when rendering
			// wrap into the container.
			hydrate('', container);
			// Append to the container (this matches React's behavior)
			container.appendChild(this._temp);
			// At this point we have mounted and should set our container.
			this._hasMounted = true;
			this._container = container;
			// Render our wrapping element into temp.
			render(wrap, container, this._temp);
			this._children = this._temp._children;
		} else {
			// When we have mounted and the vnode is present it means the
			// props have changed or a parent is triggering a rerender.
			// This implies we only need to call render. But we need to keep
			// the old tree around, otherwise will treat the vnodes as new and
			// will wrongly call `componentDidMount` on them
			container._children = this._children;
			render(wrap, container);
			this._children = container._children;
		}
	}
	// When we come from a conditional render, on a mounted
	// portal we should clear the DOM.
	else if (this._hasMounted) {
		this.componentWillUnmount();
		// if (this._temp.parentNode) this._container.removeChild(this._temp);
		// _unmount(this._wrap);
	}
	// Set the wrapping element for future unmounting.
	this._wrap = wrap;
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').VNode} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to.
 */
export function createPortal(vnode, container) {
	return createElement(Portal, { _vnode: vnode, _container: container });
}
