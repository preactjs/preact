import { EMPTY_OBJ } from './constants';

/**
  * Create an virtual node (used for JSX)
  * @param {import('./internal').VNode["tag"]} tag The node name or Component
  * constructor for this virutal node
  * @param {object | null | undefined} [props] The properties of the virtual node
  * @param {Array<import('.').ComponentChild>} [children] The children of the virtual node
  * @returns {import('./internal').VNode}
  */
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
	let ref = props.ref;
	if (ref) delete props.ref;
	let key = props.key;
	if (key) delete props.key;

	return createVNode(tag, props, null, key, ref);
}

/**
 * Create a VNode (used internally by Preact)
 * @param {import('./internal').VNode["tag"]} tag The node name or Component
 * Constructor for this virutal node
 * @param {object} props The properites of this virtual node
 * @param {string | number} text If this virtual node represents a text node,
 * this is the text of the node
 * @param {string |number | null} key The key for this virtual node, used when
 * diffing it against its children
 * @returns {import('./internal').VNode}
 */
function createVNode(tag, props, text, key, ref) {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	return { tag, props, text, key, ref, _children: null, _el: null, _component: null };
}

export function createRef() {
	return {};
}

export function Fragment(props) {
	return props.children;
}

/**
 * Coerce an untrusted value into a VNode
 * Specifically, this should be used anywhere a user could provide a boolean, string, or number where
 * a VNode or Component is desired instead
 * @param {boolean | string | number | import('./internal').VNode} possibleVNode A possible VNode
 * @returns {import('./internal').VNode}
 */
export function coerceToVNode(possibleVNode) {
	if (typeof possibleVNode === 'boolean') return null;
	if (typeof possibleVNode === 'string' || typeof possibleVNode === 'number') {
		return createVNode(null, EMPTY_OBJ, possibleVNode, null, null);
	}

	// Clone vnode if it has already been used. ceviche/#57
	if (possibleVNode!=null && possibleVNode._el!=null) {
		return createVNode(possibleVNode.tag, possibleVNode.props, possibleVNode.text, possibleVNode.key);
	}

	return possibleVNode;
}
