import { EMPTY_OBJ } from '../constants';
import { diff, unmount, getVNodeChildren } from './index';
import { toVNode } from '../render';
import { diffProps } from './props';

export function diffChildren(node, children, oldChildren, excessChildren, context, isSvg) {
	let seen = {},
		c;

	if (oldChildren!=null) {
		for (let i=oldChildren.length; i--; ) {
			let key = oldChildren[i].key;
			oldChildren[i].index = i;
			seen[key] = oldChildren[i];
		}
	}

	for (let i=0; i<children.length; i++) {
		let child = children[i],
			key = child.key,
			oldInPlaceVNode = oldChildren[i],
			oldInPlaceChild = oldInPlaceVNode!=null ? oldInPlaceVNode._el : null,
			old = seen[key];
		seen[key] = null;
		if (oldInPlaceChild!=null && oldInPlaceChild.parentNode!==node) {
			oldInPlaceChild = null;
		}

		if (!old && excessChildren!=null) {
			for (let j=0; j<excessChildren.length; j++) {
				c = excessChildren[j];
				if (c!=null && c.localName===child.tag) {
					excessChildren[j] = null;
					old = toVNode(c);
					break;
				}
			}
		}

		child.index = i;
		if (old && old._el!=null) {
			// console.log('updating child in place', old, child);
			diff(old._el, node, child, old, context, isSvg);
			if (old.index!==i) {
				node.insertBefore(child._el, oldInPlaceChild);
				continue;
			}
		}
		else {
			let created = create(null, node, child, context, isSvg);
			node.insertBefore(created, oldInPlaceChild);
		}
	}

	// for (let i in seen) if (seen[i] != null && (c = seen[i]._el)) c.remove();
	for (let i in seen) {
		if (seen[i]!=null) {
			unmount(seen[i]);
		}
	}
}

export function create(node, parent, vnode, context, isSvg) {
	let old = node;

	if (typeof vnode.tag==='function') {
		return diff(node, parent, vnode, null, context, isSvg);
	}
	else if (vnode.type===3) {
		if (node==null || node.nodeType!==3) {
			node = document.createTextNode(vnode.text);
		}
		else {
			node.nodeValue = vnode.text;
		}
	}
	else {
		// diff(null, parent, vnode, oldVNode);
		if (node==null || node.localName!==vnode.tag) {
			node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg') : document.createElement(vnode.tag);
		}
		if (vnode.props!=null) {
			diffProps(node, vnode.props, EMPTY_OBJ, isSvg);
		}
		let children = getVNodeChildren(vnode);
		for (let i=0; i<children.length; i++) {
			node.appendChild(create(null, node, children[i], context, isSvg));
		}
	}

	if (parent!=null && old!=null && node!==old) {
		parent.replaceChild(node, old);
	}

	return vnode._el = node;
}