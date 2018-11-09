import { Fragment, createElement } from '../create-element';
import { enqueueRender } from '../component';

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
	if (typeof vnode.type==='function') return vnode.type.displayName || vnode.type.name;
	else if (typeof vnode.type==='string') return vnode.type;
	else if (vnode.type===Fragment) return 'Fragment';
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

	if (c!=null) {
		// These functions will be called when the user changes state, props or
		// context values via the devtools ui panel
		updater = {
			setState: c.setState.bind(c),
			forceUpdate: c.forceUpdate.bind(c),
			setInState(path, value) {
				setIn(c.state, path, value);
				enqueueRender(c);
			},
			setInProps(path, value) {
				setIn(vnode.props, path, value);
				enqueueRender(c);
			},
			setInContext(path, value) {
				setIn(c.context, path, value);
				enqueueRender(c);
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
		text: vnode.text,
		state: c!=null ? c.state : null,
		props: vnode.props,
		// The devtools inline text children if they are the only child
		children: vnode.text==null
			? children!=null && children.length==1 && children[0].text!=null
				? children[0].text
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
	let c = vnode._component;

	if (c==null) {
		return vnode._children!=null ? vnode._children.filter(Boolean) : [];
	}

	return !Array.isArray(c._prevVNode) && c._prevVNode!=null
		? [c._prevVNode]
		: null;
}

/**
 * Get the topmost vnode in a tree
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode | null}
 */
export function getPatchedRoot(vnode) {

	/** @type {any} */
	let dom = vnode._dom;

	let last = null;
	while ((dom = dom.parentNode)!=null) {
		if (dom._prevVNode!=null) {
			last = dom._prevVNode;
		}
	}

	if (last!=null) {
		last = roots.get(getInstance(last));
		// Must always be refreshed for updates
		last._children = [vnode];
		last._component._prevVNode = vnode;
	}

	return last;
}

/**
 * Check if a vnode is a root node
 * @param {import('../internal').VNode} vnode
 * @returns {boolean}
 */
export function isRoot(vnode) {
	return vnode._dom!=null && vnode._dom.parentNode!=null &&

	/** @type {import('../internal').PreactElement} */
	(vnode._dom.parentNode)._prevVNode!=null;
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

/**
 * Check if a the profiling data ahs changed between vnodes
 * @param {import('../internal').VNode} next
 * @param {import('../internal').VNode} prev
 * @returns {boolean}
 */
export function hasProfileDataChanged(prev, next) {
	return prev.startTime!==next.startTime || prev.endTime!==next.endTime;
}

/**
 * @type {WeakMap<import('../internal').Component | import('../internal').PreactElement | HTMLElement | Text, import('../internal').VNode>}
 */
let roots = new WeakMap();

/* istanbul ignore next */
let noop = () => undefined;

/**
 * Add a wrapper node around the root. React internally has an additional
 * special `HostRoot` node at the top of each root. Because of that the Profiler
 * always skips the first vnode. To fix that we insert a virtual wrapper just
 * for the devtools.
 * @param {import('../internal').VNode} vnode
 */
export function patchRoot(vnode) {
	let inst = getInstance(vnode);
	let root = roots.get(inst);
	if (root==null) {
		root = createElement(Fragment, { children: vnode });

		// We haven't actually rendered this node so we need to fill out the
		// properties that the devtools rely upon ourselves.
		root._dom = vnode._dom;
		root.startTime = vnode.startTime;
		root.endTime = vnode.endTime;

		/** @type {*} */
		(root)._component = {
			setState: noop,
			forceUpdate: noop
		};

		// To enable profiling the devtools check if this property exists on
		// the given root node.
		/** @type {*} */
		(root).treeBaseDuration = 0;

		roots.set(inst, root);
	}

	// Must always be refreshed for updates
	root._children = [vnode];
	root._component._prevVNode = vnode;

	return root;
}
