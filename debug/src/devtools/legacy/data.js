/* istanbul ignore file */
import { Component, Fragment } from 'preact';
import { setIn } from '../util';
import { getDisplayName, getInstance } from '../vnode';

/**
 * Get the type/category of a vnode
 * @param {import('../../internal').VNode} vnode
 * @returns {import('../../internal').NodeType}
 */
export function getNodeType(vnode) {
	if (vnode.type===Fragment) return 'Wrapper';
	else if (typeof vnode.type==='function') return 'Composite';
	else if (typeof vnode.type==='string') return 'Native';
	return 'Text';
}

/**
 * Get devtools compatible data from vnode
 * @param {import('../../internal').VNode} vnode
 * @returns {import('../../internal').DevtoolData}
 */
export function getData(vnode) {
	let c = vnode._component;

	/** @type {import('../../internal').DevtoolsUpdater | null} */
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

	let children = (vnode._children || []).filter(Boolean);

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
 * @param {import('../../internal').VNode} next
 * @param {import('../../internal').VNode} prev
 * @returns {boolean}
 */
export function hasDataChanged(prev, next) {
	return (prev.props !== next.props && !shallowEqual(prev.props, next.props, true))
		|| (prev._component!=null &&
			!shallowEqual(next._component._prevState, next._component.state))
		|| prev._dom !== next._dom
		|| prev.ref !== next.ref;
}
