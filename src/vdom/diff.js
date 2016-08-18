import { ATTR_KEY } from '../constants';
import { toLowerCase, empty, isString, isFunction } from '../util';
import { isSameNodeType, isNamedNode } from './index';
import { isFunctionalComponent, buildFunctionalComponent } from './functional-component';
import { buildComponentFromVNode } from './component';
import { setAccessor, getRawNodeAttributes, getNodeType } from '../dom/index';
import { createNode, collectNode } from '../dom/recycler';
import { unmountComponent } from './component';


/** Diff recursion count, used to track the end of the diff cycle. */
export const mounts = [];

/** Diff recursion count, used to track the end of the diff cycle. */
export let diffLevel = 0;

let isSvgMode = false;


export function flushMounts() {
	let c;
	while ((c=mounts.pop())) {
		if (c.componentDidMount) c.componentDidMount();
	}
}


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
export function diff(dom, vnode, context, mountAll, parent, rootComponent, nextSibling) {
	diffLevel++;
	let ret = idiff(dom, vnode, context, mountAll, rootComponent);
	if (parent && ret.parentNode!==parent) {
		parent.insertBefore(ret, nextSibling || null);
	}
	if (!--diffLevel) flushMounts();
	return ret;
}


function idiff(dom, vnode, context, mountAll, rootComponent) {
	let originalAttributes = vnode && vnode.attributes;

	while (isFunctionalComponent(vnode)) {
		vnode = buildFunctionalComponent(vnode, context);
	}

	if (empty(vnode)) {
		vnode = '';
		if (rootComponent) {
			if (dom) {
				if (dom.nodeType===8) return dom;
				collectNode(dom);
			}
			return document.createComment(vnode);
		}
	}

	if (isString(vnode)) {
		if (dom) {
			if (getNodeType(dom)===3 && dom.parentNode) {
				dom.nodeValue = vnode;
				return dom;
			}
			collectNode(dom);
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
		recollectNodeTree(dom);
	}

	// fast-path for elements containing a single TextNode:
	if (vnode.children && vnode.children.length===1 && typeof vnode.children[0]==='string' && out.childNodes.length===1 && out.firstChild instanceof Text) {
		out.firstChild.nodeValue = vnode.children[0];
	}
	else if (vnode.children || out.firstChild) {
		innerDiffNode(out, vnode.children, context, mountAll);
	}

	diffAttributes(out, vnode.attributes);

	if (originalAttributes && originalAttributes.ref) {
		(out[ATTR_KEY].ref = originalAttributes.ref)(out);
	}

	if (svgMode) isSvgMode = false;

	return out;
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
		j, c, vchild, child;

	if (len) {
		for (let i=0; i<len; i++) {
			let child = originalChildren[i],
				key = vlen ? ((c = child._component) ? c.__key : (c = child[ATTR_KEY]) ? c.key : null) : null;
			if (key || key===0) {
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
			vchild = vchildren[i];
			child = null;

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
			child = idiff(child, vchild, context, mountAll);

			if (child!==originalChildren[i]) {
				dom.insertBefore(child, originalChildren[i] || null);
			}
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

	let component = node._component;
	if (component) {
		unmountComponent(component, !unmountOnly);
	}
	else {
		if (node[ATTR_KEY] && node[ATTR_KEY].ref) node[ATTR_KEY].ref(null);

		if (!unmountOnly) {

			collectNode(node);
		}

		if (node.childNodes && node.childNodes.length) {
			removeOrphanedChildren(node.childNodes, unmountOnly);
		}
	}
}


/** Apply differences in attributes from a VNode to the given DOM Node. */
function diffAttributes(dom, attrs) {
	let old = dom[ATTR_KEY] || getRawNodeAttributes(dom);

	// removeAttributes(dom, old, attrs || EMPTY);
	for (let name in old) {
		if (!attrs || !(name in attrs)) {
			setAccessor(dom, name, null, old[name], isSvgMode);
		}
	}

	// new & updated
	if (attrs) {
		for (let name in attrs) {
			if (!(name in old) || attrs[name]!=old[name] || ((name==='value' || name==='checked') && attrs[name]!=dom[name])) {
				setAccessor(dom, name, attrs[name], old[name], isSvgMode);
			}
		}
	}
}
