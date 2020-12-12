import { createVNode, Fragment } from '../create-element';

/**
 * @param {import("../internal").ComponenChildren} childVNode
 * @param {import("../internal").VNode} newParentVNode
 */
export function normalizeVNode(childVNode, newParentVNode) {
	if (childVNode == null || typeof childVNode == 'boolean') {
		return null;
	}
	// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
	// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
	// it's own DOM & etc. pointers
	else if (typeof childVNode == 'string' || typeof childVNode == 'number') {
		childVNode = createVNode(null, childVNode, null, null, childVNode);
	} else if (Array.isArray(childVNode)) {
		childVNode = createVNode(
			Fragment,
			{ children: childVNode },
			null,
			null,
			null
		);
	} else if (childVNode._dom != null || childVNode._component != null) {
		childVNode = createVNode(
			childVNode.type,
			childVNode.props,
			childVNode.key,
			null,
			childVNode._original
		);
	}

	childVNode._parent = newParentVNode;
	childVNode._depth = newParentVNode._depth + 1;

	return childVNode;
}
