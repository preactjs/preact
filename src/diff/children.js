import { EMPTY_OBJ } from '../constants';
import { diff, getVNodeChildren } from './index';
import { toVNode } from '../render';
import { diffProps } from './props';

export function diffChildren(node, children, oldChildren, excessChildren, context) {
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
			diff(old._el, node, child, old, context);
			if (old.index!==i) {
				node.insertBefore(child._el, oldInPlaceChild);
				continue;
			}
		}
		else {
			let created = create(null, node, child, context);
			node.insertBefore(created, oldInPlaceChild);
		}
	}

	for (let i in seen) if (seen[i]!=null && (c = seen[i]._el)) c.remove();
}

export function create(node, parent, vnode, context) {
	let old = node;

	if (typeof vnode.tag==='function') {
		return diff(node, parent, vnode, null, context)
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
			node = document.createElement(vnode.tag);
		}
		if (vnode.props!=null) {
			diffProps(node, vnode.props, EMPTY_OBJ);
		}
		let children = getVNodeChildren(vnode);
		for (let i=0; i<children.length; i++) {
			node.appendChild(create(null, node, children[i], context));
		}
	}

	if (parent!=null && old!=null && node!==old) {
		parent.replaceChild(node, old);
	}

	return vnode._el = node;
}