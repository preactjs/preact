import { Fragment } from '../create-element';

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
				c.forceUpdate();
			},
			setInProps() {
				// TODO
				c.forceUpdate();
			},
			setInContext() {
				// TODO
				c.forceUpdate();
			}
		};
	}

	let children = getChildren(vnode);

	return {
		nodeType: getNodeType(vnode),
		type: vnode.type,
		name: getDisplayName(vnode),
		ref: vnode.ref || null,
		key: vnode.key || null,
		updater,
		text: vnode.text,
		state: c!=null ? c.state : {},
		props: vnode.props,
		// The devtools inline text children if they are the only child
		children: vnode.text==null
			? children.length==1 && children[0].text!=null
				? children[0].text
				: children
			: null,
		publicInstance: vnode._el,

		// Profiler data
		actualDuration: vnode.duration,
		actualStartTime: vnode.startTime,
		treeBaseDuration: 0
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
