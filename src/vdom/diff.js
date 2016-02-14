import { TEXT_CONTENT, UNDEFINED_ELEMENT, EMPTY } from '../constants';
import { hasOwnProperty, empty, toLowerCase, isString, isFunction } from '../util';
import { hook, deepHook } from '../hooks';
import { isSameNodeType } from '.';
import { isFunctionalComponent, buildFunctionalComponent } from './functional-component';
import { buildComponentFromVNode } from './component';
import { appendChildren, getAccessor, setAccessor, getNodeAttributes } from '../dom';
import { collectComponent } from './component-recycler';
import { createNode, collectNode } from '../dom/recycler';


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
export default function diff(dom, vnode, context) {
	if (isFunctionalComponent(vnode)) {
		return diff(dom, buildFunctionalComponent(vnode, context), context);
	}

	if (isFunction(vnode.nodeName)) {
		return buildComponentFromVNode(dom, vnode, context);
	}

	if (isString(vnode)) {
		if (dom) {
			let type = dom.nodeType;
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

	return diffNode(dom, vnode, context);
}


/** Apply changes from a VNode to the given DOM Node. */
function diffNode(dom, vnode, context) {
	let out = dom,
		nodeName = vnode.nodeName || UNDEFINED_ELEMENT;

	if (!dom) {
		out = createNode(nodeName);
	}
	else if (toLowerCase(dom.nodeName)!==nodeName) {
		out = createNode(nodeName);
		appendChildren(out, dom.childNodes);
		// reclaim element nodes
		if (dom.nodeType===1) collectNode(dom);
	}

	let children,
		keyed,
		keyedLen = 0,
		len = out.childNodes.length,
		childrenLen = 0,
		i = 0;
	if (len) {
		children = [];
		for ( ; i<len; i++) {
			let child = out.childNodes[i],
				key = getAccessor(child, 'key') || child._component && child._component.props && child._component.props.key;
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


	diffAttributes(out, vnode);


	let vchildren = vnode.children,
		vlen = vchildren && vchildren.length,
		min = 0;
	if (vlen) {
		for (i=0; i<vlen; i++) {
			let vchild = vchildren[i],
				child;

			// if (isFunctionalComponent(vchild)) {
			// 	vchild = buildFunctionalComponent(vchild);
			// }

			if (keyedLen) {
				let attrs = vchild.attributes,
					key = attrs && attrs.key;
				if (!empty(key) && keyed.hasOwnProperty(key)) {
					child = keyed[key];
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
						if (j===min+1) min++;
						break;
					}
				}
			}

			// morph the matched/found/created DOM child to match vchild (deep)
			child = diff(child, vchild, context);

			if (out.childNodes[i]!==child) {
				let c = child._component,
					next = out.childNodes[i+1];
				if (c) deepHook(c, 'componentWillMount');
				if (next) {
					out.insertBefore(child, next);
				}
				else {
					out.appendChild(child);
				}
				if (c) deepHook(c, 'componentDidMount');
			}
		}
	}


	if (keyedLen) {
		/*eslint guard-for-in:0*/
		for (i in keyed) {
			children[childrenLen++] = keyed[i];
		}
	}

	// remove orphaned children
	if (min<childrenLen) {
		removeOrphanedChildren(out, children);
	}

	return out;
}


/** Reclaim children that were unreferenced in the desired VTree */
function removeOrphanedChildren(out, children) {
	for (let i=children.length; i--; ) {
		let child = children[i];
		if (child) {
			let c = child._component;

			if (c) hook(c, 'componentWillUnmount');

			out.removeChild(child);

			if (c) {
				hook(c, 'componentDidUnmount');
				collectComponent(c);
			}
			else if (child.nodeType===1) {
				collectNode(child);
			}
		}
	}
}


/** Apply differences in attributes from a VNode to the given DOM Node. */
function diffAttributes(dom, vnode) {
	// apply attributes
	let old = getNodeAttributes(dom) || EMPTY,
		attrs = vnode.attributes || EMPTY,
		name, value, prev;

	// removed attributes
	if (old!==EMPTY) {
		for (name in old) {
			if (hasOwnProperty.call(old, name)) {
				value = attrs[name];
				if (empty(value)) {
					setAccessor(dom, name, null, old[name]);
				}
			}
		}
	}

	// new & updated attributes
	if (attrs!==EMPTY) {
		for (name in attrs) {
			if (hasOwnProperty.call(attrs, name)) {
				value = attrs[name];
				if (!empty(value)) {
					prev = getAccessor(dom, name, old[name]);
					if (value!=prev) {
						setAccessor(dom, name, value, prev);
					}
				}
			}
		}
	}
}
