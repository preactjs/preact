import { Fragment } from '../create-element';
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
	if (typeof vnode.type==='function') return vnode.type.name;
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

	if (c!=null) {
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
			? children.length==1 && children[0].text!=null
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
 * Get all rendered vnode children as an array
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode[]}
 */
export function getChildren(vnode) {
	let c = vnode._component;
	return c!=null
		? Array.isArray(c._previousVTree)
			? c._previousVTree
			: [c._previousVTree]
		: vnode._children!=null
			? vnode._children
			: [];
}

/**
 * Get the topmost vnode in a tree
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').VNode | null}
 */
export function getRoot(vnode) {

	/** @type {any} */
	let dom = vnode._el;
	if (dom==null) return null;

	let last = null;
	while ((dom = dom.parentNode)!=null) {
		if (dom._previousVTree!=null) {
			last = dom._previousVTree;
		}
	}

	return last;
}

/**
 * Check if a vnode is a root node
 * @param {import('../internal').VNode} vnode
 * @returns {boolean}
 */
export function isRoot(vnode) {
	return vnode._el!=null && vnode._el.parentNode!=null && vnode._el.parentNode._previousVTree!=null;
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
	return vnode._el;
}

/**
 * Check if a vnode was actually updated
 * @param {import('../internal').VNode} next
 * @param {import('../internal').VNode} prev
 * @returns {boolean}
 */
export function hasDataChanged(prev, next) {
	return prev.startTime!==next.startTime
		|| prev.endTime!==next.endTime
		|| prev.props!==next.props
		|| (prev._component!=null && (prev._component.state
			!== next._component.state))
		|| prev._el !== next._el
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
