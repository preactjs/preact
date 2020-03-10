import { createElement, hydrate, render, _unmount } from 'preact';

class ContextProvider {
	getChildContext() {
		return this.props.context;
	}
	render(props) {
		return props.children;
	}
}

/**
 * Portal component
 * @param {object | null | undefined} props
 */
function Portal(props) {
	let _this = this;
	let container = props.container;
	let wrap = createElement(
		ContextProvider,
		{ context: _this.context },
		props.vnode
	);

	// When we change container we should clear our old container and
	// indicate a new mount.
	if (_this._container && _this._container !== container) {
		if (_this._temp.parentNode) _this._container.removeChild(_this._temp);
		_unmount(_this._wrap);
		_this._hasMounted = false;
	}

	// When props.vnode is undefined/false/null we are dealing with some kind of
	// conditional vnode. This should not trigger a render.
	if (props.vnode) {
		if (!_this._hasMounted) {
			// Create a placeholder that we can use to insert into.
			_this._temp = document.createTextNode('');
			// Hydrate existing nodes to keep the dom intact, when rendering
			// wrap into the container.
			hydrate('', container);
			// Append to the container (this matches React's behavior)
			container.appendChild(_this._temp);
			// At this point we have mounted and should set our container.
			_this._hasMounted = true;
			_this._container = container;
			// Render our wrapping element into temp.
			render(wrap, container, _this._temp);
			_this._children = _this._temp._children;
		} else {
			// When we have mounted and the vnode is present it means the
			// props have changed or a parent is triggering a rerender.
			// This implies we only need to call render. But we need to keep
			// the old tree around, otherwise will treat the vnodes as new and
			// will wrongly call `componentDidMount` on them
			container._children = _this._children;
			render(wrap, container);
			_this._children = container._children;
		}
	}
	// When we come from a conditional render, on a mounted
	// portal we should clear the DOM.
	else if (_this._hasMounted) {
		if (_this._temp.parentNode) _this._container.removeChild(_this._temp);
		_unmount(_this._wrap);
	}
	// Set the wrapping element for future unmounting.
	_this._wrap = wrap;

	_this.componentWillUnmount = () => {
		if (_this._temp.parentNode) _this._container.removeChild(_this._temp);
		_unmount(_this._wrap);
	};

	return null;
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').VNode} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to.
 */
export function createPortal(vnode, container) {
	return createElement(Portal, { vnode, container });
}
