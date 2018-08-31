import { EMPTY_OBJ } from './constants';

export function createElement(tag, props, children) {
	if (props==null) props = {};
	if (arguments.length>3) {
		children = [children];
		for (let i=3; i<arguments.length; i++) {
			children.push(arguments[i]);
		}
	}
	if (children!=null) {
		props.children = children;
	}
	if (tag.defaultProps!=null) {
		for (let i in tag.defaultProps) {
			if (props[i]===undefined) props[i] = tag.defaultProps[i];
		}
	}
	return createVNode(tag, props, null, props.key);
}

function createVNode(tag, props, text, key) {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	return { tag, props, text, key, _children: null, _el: null, _component: null };
}

export function Fragment(props) {
	return props.children;
}

/**
 * Coerce an untrusted value into a VNode
 * Specifically, this should be used anywhere a user could provide a boolean, string, or number where
 * a VNode or Component is desired instead
 * @param {boolean | string | number | function | object} possibleVNode A possible VNode
 * @returns {object | function}
 */
export function coerceToVNode(possibleVNode) {
	if (typeof possibleVNode === 'boolean') return null;
	if (typeof possibleVNode === 'string' || typeof possibleVNode === 'number') {
		return createVNode(null, EMPTY_OBJ, possibleVNode, null);
	}

	// Clone vnode if it has already been used. ceviche/#57
	if (possibleVNode!=null && possibleVNode._el!=null) {
		return createVNode(possibleVNode.tag, possibleVNode.props, possibleVNode.text, possibleVNode.key);
	}

	return possibleVNode;
}
