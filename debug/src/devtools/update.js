import { setIn } from './util';
import { getVNode } from './cache';

/**
 * Update component state
 * @param {number} id
 * @param {string[]} path
 * @param {*} value
 */
export function setInState(id, path, value) {
	let vnode = getVNode(id);
	vnode._component.setState(prev => {
		setIn(prev, path, value);
		return prev;
	});
}

/**
 * Update component props
 * @param {number} id
 * @param {string[]} path
 * @param {*} value
 */
export function setInProps(id, path, value) {
	let vnode = getVNode(id);
	setIn(vnode.props, path, value);
	vnode._component.setState({});
}
