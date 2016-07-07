import { ATTR_KEY } from '../constants';
import { toLowerCase, empty, isString, isFunction } from '../util';
import { hook, deepHook } from '../hooks';
import { isSameNodeType, isNamedNode } from '.';
import { isFunctionalComponent, buildFunctionalComponent } from './functional-component';
import { buildComponentFromVNode } from './component';
import { removeNode, setAccessor, getRawNodeAttributes, getNodeType } from '../dom';
import { createNode, collectNode } from '../dom/recycler';
import { unmountComponent } from './component';


let isSvgMode = false;


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
export function diff(dom, vnode, context, mountAll, unmountChildrenOnly) {
	let originalAttributes = vnode.attributes;

	while (isFunctionalComponent(vnode)) {
		vnode = buildFunctionalComponent(vnode, context);
	}

	if (isString(vnode)) {
		if (dom) {
			if (getNodeType(dom)===3) {
				if (dom.nodeValue!==vnode) {
					dom.nodeValue = vnode;
				}
				return dom;
			}
			if (!unmountChildrenOnly) collectNode(dom);
		}
		return document.createTextNode(vnode);
	}

	let out = dom,
		nodeName = vnode.nodeName,
		svgMode;

	if (isFunction(nodeName)) {
		return buildComponentFromVNode(dom, vnode, context, mountAll);
	}
	if (!isString(nodeName)) {
		nodeName = String(nodeName);
	}

	svgMode = toLowerCase(nodeName)==='svg';

	if (svgMode) isSvgMode = true;

	if (!dom) {
		out = createNode(nodeName, isSvgMode);
	}
	else if (!isNamedNode(dom, nodeName)) {
		out = createNode(nodeName, isSvgMode);
		// move children into the replacement node
		while (dom.firstChild) out.appendChild(dom.firstChild);
		// reclaim element nodes
		if (!unmountChildrenOnly) recollectNodeTree(dom);
	}

	diffNode(out, vnode.children, context, mountAll);

	diffAttributes(out, vnode.attributes);

	if (originalAttributes && originalAttributes.ref) {
		(out[ATTR_KEY].ref = originalAttributes.ref)(out);
	}

	if (svgMode) isSvgMode = false;

	return out;
}


/** Morph a DOM node to look like the given VNode. Creates DOM if it doesn't exist. */
function diffNode(dom, vchildren, context, mountAll) {
	let firstChild = dom.firstChild;
	if (vchildren && vchildren.length===1 && typeof vchildren[0]==='string' && firstChild instanceof Text && dom.childNodes.length===1) {
		firstChild.nodeValue = vchildren[0];
	}
	else if (vchildren || firstChild) {
		innerDiffNode(dom, vchildren, context, mountAll);
	}

}


function getKey(child) {
	let c = child._component;
	if (c) return c.__key;

	let data = child[ATTR_KEY];
	if (data) return data.key;
}


/** Apply child and attribute changes between a VNode and a DOM Node to the DOM. */
function innerDiffNode(dom, vchildren, context, mountAll) {
	let originalChildren = dom.childNodes,
		children = [],
		keyed = {},
		keyedLen = 0,
		min = 0,
		len = originalChildren.length,
		childrenLen = 0,
		vlen = vchildren && vchildren.length,
		j, c;

	if (len) {
		for (let i=0; i<len; i++) {
			let child = originalChildren[i],
				key = getKey(child);
			if ((key || key===0) && vlen) {
				keyedLen++;
				keyed[key] = child;
			}
			else {
				children[childrenLen++] = child;
			}
		}
	}

	if (vlen) {
		for (let i=0; i<vlen; i++) {
			let vchild = vchildren[i],
				child;

			// if (isFunctionalComponent(vchild)) {
			// 	vchild = buildFunctionalComponent(vchild);
			// }

			// attempt to find a node based on key matching
			if (keyedLen && vchild.attributes) {
				let key = vchild.key;
				if (!empty(key) && key in keyed) {
					child = keyed[key];
					keyed[key] = undefined;
					keyedLen--;
				}
			}

			// attempt to pluck a node of the same type from the existing children
			if (!child && min<childrenLen) {
				for (j=min; j<childrenLen; j++) {
					c = children[j];
					if (c && isSameNodeType(c, vchild)) {
						child = c;
						children[j] = undefined;
						if (j===childrenLen-1) childrenLen--;
						if (j===min) min++;
						break;
					}
				}
			}

			// morph the matched/found/created DOM child to match vchild (deep)
			child = diff(child, vchild, context, mountAll);

			c = (mountAll || child.parentNode!==dom) && child._component;

			if (c) deepHook(c, 'componentWillMount');

			let next = originalChildren[i];
			if (next!==child && originalChildren[i+1]!==child) {
				if (next) {
					dom.insertBefore(child, next);
				}
				else {
					dom.appendChild(child);
				}
			}

			if (c) deepHook(c, 'componentDidMount');
		}
	}


	if (keyedLen) {
		/*eslint guard-for-in:0*/
		for (let i in keyed) if (keyed[i]) {
			children[min=childrenLen++] = keyed[i];
		}
	}

	// remove orphaned children
	if (min<childrenLen) {
		removeOrphanedChildren(children);
	}
}


/** Reclaim children that were unreferenced in the desired VTree */
export function removeOrphanedChildren(children, unmountOnly) {
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
		unmountComponent(component, !unmountOnly);
	}
	else {
		if (!unmountOnly) {
			if (getNodeType(node)!==1) {
				removeNode(node);
				return;
			}

			collectNode(node);
		}

		let c = node.childNodes;
		if (c && c.length) {
			removeOrphanedChildren(c, unmountOnly);
		}
	}
}


/** Apply differences in attributes from a VNode to the given DOM Node. */
function diffAttributes(dom, attrs) {
	let old = dom[ATTR_KEY] || getRawNodeAttributes(dom);

	// removeAttributes(dom, old, attrs || EMPTY);
	for (let name in old) {
		if (!attrs || !(name in attrs)) {
			setAccessor(dom, name, null, isSvgMode);
		}
	}

	// new & updated
	if (attrs) {
		for (let name in attrs) {
			if (!(name in old) || attrs[name]!=(name==='value' || name==='selected' || name==='checked' ? dom[name] : old[name])) {
				setAccessor(dom, name, attrs[name], isSvgMode);
			}
		}
	}
}
