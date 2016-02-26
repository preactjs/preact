import { ATTR_KEY, TEXT_CONTENT, UNDEFINED_ELEMENT, EMPTY } from '../constants';
import { hasOwnProperty, toArray, empty, toLowerCase, isString, isFunction } from '../util';
import { hook, deepHook } from '../hooks';
import { isSameNodeType } from '.';
import { isFunctionalComponent, buildFunctionalComponent } from './functional-component';
import { buildComponentFromVNode } from './component';
import { appendChildren, getAccessor, setAccessor, getNodeAttributes, getNodeType } from '../dom';
import { unmountComponent } from './component';
import { createNode, collectNode } from '../dom/recycler';


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
export default function diff(dom, vnode, context, component) {
	while (isFunctionalComponent(vnode)) {
		vnode = buildFunctionalComponent(vnode, context);
	}

	if (isFunction(vnode.nodeName)) {
		return buildComponentFromVNode(dom, vnode, context);
	}

	if (isString(vnode)) {
		if (dom) {
			let type = getNodeType(dom);
			if (type===3) {
				dom[TEXT_CONTENT] = vnode;
				return dom;
			}
			else if (type===1) {
				collectNode(dom);
			}
		}
		return document.createTextNode(vnode);
	}

	// return diffNode(dom, vnode, context);
// }


/** Morph a DOM node to look like the given VNode. Creates DOM if it doesn't exist. */
// function diffNode(dom, vnode, context) {
	let out = dom,
		nodeName = vnode.nodeName || UNDEFINED_ELEMENT;

	if (!dom) {
		out = createNode(nodeName);
	}
	else if (toLowerCase(dom.nodeName)!==nodeName) {
		out = createNode(nodeName);
		// move children into the replacement node
		appendChildren(out, toArray(dom.childNodes));
		// reclaim element nodes
		recollectNodeTree(dom);
	}

	innerDiffNode(out, vnode, context);

	let attrs = vnode.attributes,
		c = out._component;
	if (attrs) hook(attrs, 'ref', (!component || c===component) && c || out);

	return out;
}


/** Apply child and attribute changes between a VNode and a DOM Node to the DOM. */
function innerDiffNode(dom, vnode, context) {
	let children,
		keyed,
		keyedLen = 0,
		len = dom.childNodes.length,
		childrenLen = 0;
	if (len) {
		children = [];
		for (let i=0; i<len; i++) {
			let child = dom.childNodes[i],
				props = child._component && child._component.props,
				key = props ? props.key : getAccessor(child, 'key');
			if (!empty(key)) {
				if (!keyed) keyed = {};
				keyed[key] = child;
				keyedLen++;
			}
			else {
				children[childrenLen++] = child;
			}
		}
	}


	diffAttributes(dom, vnode);


	let vchildren = vnode.children,
		vlen = vchildren && vchildren.length,
		min = 0;
	if (vlen) {
		for (let i=0; i<vlen; i++) {
			let vchild = vchildren[i],
				child;

			// if (isFunctionalComponent(vchild)) {
			// 	vchild = buildFunctionalComponent(vchild);
			// }

			// attempt to find a node based on key matching
			if (keyedLen) {
				let attrs = vchild.attributes,
					key = attrs && attrs.key;
				if (!empty(key) && keyed.hasOwnProperty(key)) {
					child = keyed[key];
					keyed[key] = null;
					keyedLen--;
				}
			}

			// attempt to pluck a node of the same type from the existing children
			if (!child && min<childrenLen) {
				for (let j=min; j<childrenLen; j++) {
					let c = children[j];
					if (c && isSameNodeType(c, vchild)) {
						child = c;
						children[j] = null;
						if (j===childrenLen-1) childrenLen--;
						if (j===min) min++;
						break;
					}
				}
			}

			// morph the matched/found/created DOM child to match vchild (deep)
			child = diff(child, vchild, context);

			if (dom.childNodes[i]!==child) {
				let c = child.parentNode!==dom && child._component,
					next = dom.childNodes[i+1];
				if (c) deepHook(c, 'componentWillMount');
				if (next) {
					dom.insertBefore(child, next);
				}
				else {
					dom.appendChild(child);
				}
				if (c) deepHook(c, 'componentDidMount');
			}
		}
	}


	if (keyedLen) {
		/*eslint guard-for-in:0*/
		for (let i in keyed) if (keyed.hasOwnProperty(i) && keyed[i]) {
			children[childrenLen++] = keyed[i];
		}
	}

	// remove orphaned children
	if (min<childrenLen) {
		removeOrphanedChildren(dom, children);
	}
}


/** Reclaim children that were unreferenced in the desired VTree */
export function removeOrphanedChildren(out, children, unmountOnly) {
	for (let i=children.length; i--; ) {
		let child = children[i];
		if (child) {
			recollectNodeTree(child, unmountOnly);
		}
	}
}


/** Reclaim an entire tree of nodes, starting at the root. */
export function recollectNodeTree(node, unmountOnly) {
	// @TODO: Need to make a call on whether Preact should remove nodes not created by itself.
	// Currently it *does* remove them. Discussion: https://github.com/developit/preact/issues/39
	//if (!node[ATTR_KEY]) return;

	let attrs = node[ATTR_KEY];
	if (attrs) hook(attrs, 'ref', null);

	let component = node._component;
	if (component) {
		unmountComponent(node, component);
	}
	else {
		if (!unmountOnly) {
			if (getNodeType(node)!==1) {
				let p = node.parentNode;
				if (p) p.removeChild(node);
				return;
			}

			collectNode(node);
		}

		let c = node.childNodes;
		if (c && c.length) {
			removeOrphanedChildren(node, c, unmountOnly);
		}
	}
}


/** Apply differences in attributes from a VNode to the given DOM Node. */
function diffAttributes(dom, vnode) {
	let old = getNodeAttributes(dom) || EMPTY,
		attrs = vnode.attributes || EMPTY,
		name, value;

	// removed
	for (name in old) {
		if (empty(attrs[name])) {
			setAccessor(dom, name, null);
		}
	}

	// new & updated
	if (attrs!==EMPTY) {
		for (name in attrs) {
			if (hasOwnProperty.call(attrs, name)) {
				value = attrs[name];
				if (!empty(value) && value!=getAccessor(dom, name)) {
					setAccessor(dom, name, value);
				}
			}
		}
	}
}
