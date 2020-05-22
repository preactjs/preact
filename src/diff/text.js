import { findMatchingExcessDom } from './index';

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {*} excessDomChildren
 * @returns {import('../internal').PreactElement}
 */
export function diffTextNode(newVNode, oldVNode, excessDomChildren) {
	let dom;
	if (excessDomChildren != null) {
		// Determine if there is a way to simplify this for just text nodes
		dom = findMatchingExcessDom(oldVNode._dom, newVNode, excessDomChildren);
	} else {
		dom = oldVNode._dom;
	}

	if (dom == null) {
		return document.createTextNode(newVNode.props);
	}

	if (oldVNode.props !== newVNode.props && dom.data != newVNode.props) {
		dom.data = newVNode.props;
	}

	return dom;
}
