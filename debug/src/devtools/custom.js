/* istanbul ignore file */
import { Component, Fragment } from 'preact';

/**
 * Get the type/category of a vnode
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').NodeType}
 */
export function getNodeType(vnode) {
	if (vnode.type===Fragment) return 'Wrapper';
	else if (typeof vnode.type==='function') return 'Composite';
	else if (typeof vnode.type==='string') return 'Native';
	return 'Text';
}

/**
 * Get human readable name of the component/dom element
 * @param {import('../internal').VNode} vnode
 * @returns {string}
 */
export function getDisplayName(vnode) {
	if (vnode.type===Fragment) return 'Fragment';
	else if (typeof vnode.type==='function') return vnode.type.displayName || vnode.type.name;
	else if (typeof vnode.type==='string') return vnode.type;
	return '#text';
}

/**
 * Deeply mutate a property by walking down an array of property keys
 * @param {object} obj
 * @param {Array<string | number>} path
 * @param {any} value
 */
export function setIn(obj, path, value) {
	let last = path.pop();
	let parent = path.reduce((acc, attr) => acc ? acc[attr] : null, obj);
	if (parent) {
		parent[last] = value;
	}
}

/**
 * Get devtools compatible data from vnode
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').DevtoolData}
 */
export function getData(vnode) {
	let c = vnode._component;

	/** @type {import('../internal').DevtoolsUpdater | null} */
	let updater = null;

	if (c!=null && c instanceof Component) {
		// These functions will be called when the user changes state, props or
		// context values via the devtools ui panel
		updater = {
			setState: c.setState.bind(c),
			forceUpdate: c.forceUpdate.bind(c),
			setInState(path, value) {
				c.setState(prev => {
					setIn(prev, path, value);
					return prev;
				});
			},
			setInProps(path, value) {
				setIn(vnode.props, path, value);
				c.setState({});
			},
			setInContext(path, value) {
				setIn(c.context, path, value);
				c.setState({});
			}
		};
	}

	let children = getChildren(vnode);

	let duration = vnode.endTime - vnode.startTime;
	return {
		nodeType: getNodeType(vnode),
		type: vnode.type,
		name: getDisplayName(vnode),
		ref: vnode.ref || null,
		key: vnode.key || null,
		updater,
		text: vnode.type===null ? vnode.props : null,
		state: c!=null && c instanceof Component ? c.state : null,
		props: vnode.props,
		// The devtools inline text children if they are the only child
		children: vnode.type!==null
			? children!=null && children.length==1 && children[0].type===null
				? children[0].props
				: children
			: null,
		publicInstance: getInstance(vnode),
		memoizedInteractions: [],

		// Profiler data
		actualDuration: duration,
		actualStartTime: vnode.startTime,
		treeBaseDuration: duration
	};
}

/**
 * Get all rendered vnode children as an array. Moreover we need to filter
 * out `null` or other falsy children.
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode[]}
 */
export function getChildren(vnode) {
	if (vnode._component==null) {
		return vnode._children!=null ? vnode._children.filter(Boolean) : [];
	}

	return vnode._children != null ? vnode._children.filter(Boolean) : null;
}

/**
 * Check if a vnode is a root node
 * @param {import('../internal').VNode} vnode
 * @returns {boolean}
 */
export function isRoot(vnode) {
	// Timings of root vnodes will never be set
	return vnode.type===Fragment && vnode._parent === null;
}

/**
 * Cache a vnode by its instance and retrieve previous vnodes by the next
 * instance.
 *
 * We need this to be able to identify the previous vnode of a given instance.
 * For components we want to check if we already rendered it and use the class
 * instance as key. For html elements we use the dom node as key.
 *
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').Component | import('../internal').PreactElement | Text | null}
 */
export function getInstance(vnode) {
	// Use the parent element as instance for root nodes
	if (isRoot(vnode)) {
		// Edge case: When the tree only consists of components that have not rendered
		// anything into the DOM we revert to using the vnode as instance.
		return vnode._children.length > 0 && vnode._children[0]!=null && vnode._children[0]._dom!=null
			? /** @type {import('../internal').PreactElement | null} */
			(vnode._children[0]._dom.parentNode)
			: vnode;
	}
	if (vnode._component!=null) return vnode._component;
	if (vnode.type===Fragment) return vnode.props;
	return vnode._dom;
}

/**
 * Compare two objects
 * @param {object} a
 * @param {object} b
 * @param {boolean} [isProps]
 * @returns {boolean}
 */
export function shallowEqual(a, b, isProps) {
	if (a==null || b==null) return false;

	for (let key in a) {
		if (isProps && key=='children' && b[key]!=null) continue;
		if (a[key]!==b[key]) return false;
	}

	if (Object.keys(a).length!==Object.keys(b).length) return false;
	return true;
}

/**
 * Check if a vnode was actually updated
 * @param {import('../internal').VNode} next
 * @param {import('../internal').VNode} prev
 * @returns {boolean}
 */
export function hasDataChanged(prev, next) {
	return (prev.props !== next.props && !shallowEqual(prev.props, next.props, true))
		|| (prev._component!=null &&
			!shallowEqual(next._component._prevState, next._component.state))
		|| prev._dom !== next._dom
		|| prev.ref !== next.ref;
}
