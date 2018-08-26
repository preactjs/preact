import { diff, unmount } from './index';
// import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
// import { diff, unmount, getVNodeChildren } from './index';
// import { diffProps } from './props';
// import { cloneElement } from '../clone-element';


export function diffChildren(node, children, oldChildren, context, isSvg, excessChildren, isRootDiff, mounts) {
	// if (oldChildren==null) oldChildren = EMPTY_ARR;

	// let __children = oldChildren.map(cloneElement);
	// let __operation = `Diff (${__children.length} -> ${children.length}).`;
	// let oldDomChildren = Array.prototype.slice.call(node.childNodes);

	// let seen = {},
	// 	c;

	// // console.log('diffChildren', excessChildren);

	// // let types = {};
	// if (oldChildren!=null) {
	// 	// for (let i=oldChildren.length; i--; ) {
	// 	for (let i=0; i<oldChildren.length; i++) {
	// 		oldChildren[i].index = i;
	// 		// seen[oldChildren[i].key] = oldChildren[i];
	// 		seen[oldChildren[i].key || i] = oldChildren[i];

	// 		// let vnode = oldChildren[i];
	// 		// let key = vnode.key;
	// 		// if (key==null) {
	// 		// 	key = `${vnode.type}_${vnode.tag}`;
	// 		// 	key += '_' + (types[key] = (types[key] || 0) + 1);
	// 		// }
	// 		// seen[key] = vnode;
	// 	}
	// }

	// console.log(Object.assign({}, seen));

	// sorted in reverse DOM order for convenient pop()
	// let excessChildrenIndex = 0;
	// let excessChildrenByType;
	// if (excessChildren!=null) {
	// 	excessChildrenByType = {};
	// 	for (let i=excessChildren.length; i--; ) {
	// 		let type = excessChildren[i].localName;
	// 		(excessChildrenByType[type] || (excessChildrenByType[type] = [])).push(i);
	// 	}
	// }

	let child, i, j, p, index, old, newEl,
		oldChildrenLength = oldChildren.length,
		childNode = node.firstChild,
		next, sib;

	// types = {};
	for (i=0; i<children.length; i++) {
		// let nextChild = childNode==null ? null : childNode.nextSibling;

		// let key = children[i].key;
		// if (key==null) {
		// 	key = `${children[i].type}_${children[i].tag}`;
		// 	key += '_' + (types[key] = (types[key] || 0) + 1);
		// }

		child = children[i];
		old = index = null;

		// let child = children[i],

		// __operation += '\n';
		// let index;
		p = oldChildren[i];
		if (p != null && (child.key==null ? (child.type === p.type && child.tag === p.tag) : (child.key === p.key))) {
			index = i;
		}
		else {
			for (j=0; j<oldChildrenLength; j++) {
				p = oldChildren[j];
				if (p!=null) {
					if (child.key==null ? (child.type === p.type && child.tag === p.tag) : (child.key === p.key)) {
						index = j;
						break;
					}
				}
			}
		}
		if (index!=null) {
			old = oldChildren[index];
			oldChildren[index] = null;
			// __operation += ` -> <${old.tag && old.tag.name || old.tag} index="${index}" key="${old.key}">`;
		}

		// let previousNode = old==null ? null : old._el;
		// 	old = seen[key];
		// seen[key] = null;

		// if (oldInPlaceChild!=null && oldInPlaceChild.parentNode!==node) {
		// 	// console.log('ditching child', oldInPlaceVNode, old, child);
		// 	oldInPlaceChild = null;
		// }

		// if (!old && excessChildrenByType!=null) {
		// 	let index = excessChildrenByType[child.tag] && excessChildrenByType[child.tag].pop();
		// 	if (index!=null && (old = excessChildrenByType[index])==null) {
		// 		excessChildren[index] = null;
		// 	}
		// 	else {
		// 		for (; excessChildrenIndex<excessChildren.length; excessChildrenIndex++) {
		// 			if ((old = excessChildren[excessChildrenIndex])!=null) {
		// 				excessChildren[excessChildrenIndex] = null;
		// 				break;
		// 			}
		// 		}
		// 	}
		// 	console.log('hydrating from excess children: ', child.tag, old);
		// }

		// if (!old && excessChildren!=null) {
		// 	// console.log('hydrating from excess children');
		// 	for (let j=0; j<excessChildren.length; j++) {
		// 		c = excessChildren[j];
		// 		if (c!=null && c.localName===child.tag) {
		// 			// console.log('found hydration match for '+child.tag);
		// 			excessChildren[j] = null;
		// 			//old = toVNode(c);
		// 			break;
		// 		}
		// 	}
		// }

		// child.index = i;
		// diff(old && old._el, node, child, old, context, isSvg, oldInPlaceChild);

		// console.log(old);

		// let next = old!=null && old._el && old._el.nextSibling;

		// let next = old!=null && old._el!=null && old._el.nextSibling;
		// let prev = old!=null && old._el;

		next = childNode!=null && childNode.nextSibling;

		newEl = diff(old==null ? null : old._el, node, child, old, context, isSvg, false, excessChildren, isRootDiff, mounts);
		if (newEl!=null) {
			// let childNode;
			// childNode = null;
			// let childNode = node.childNodes[i];
			// if (old==null || newEl!=childNode || newEl.parentNode==null) {
			// if (newEl!=null && (old==null || old.index!==i)) {
			// if (old==null || newEl.parentNode==null || newEl!=(childNode = node.childNodes[i])) {
			if (old==null || newEl!=childNode || newEl.parentNode==null) {
				// node.insertBefore(newEl, node.childNodes[i]);
				// node.insertBefore(newEl, childNode);
				// let nextChild;


				outer: if (Array.isArray(children) || (childNode==null || childNode.parentNode!==node)) {
					node.appendChild(newEl);
				}
				else {
					sib = childNode;
					// j = i;
					j = 0;
					// while ((sib=sib.nextSibling) && j++<oldChildrenLength/2) {
					while ((sib=sib.nextSibling) && j++<oldChildrenLength/2) {
						if (sib===newEl) {
							oldChildren[index] = childNode;
							break outer;
						}
					}
					node.insertBefore(newEl, childNode);
				}

				next = newEl.nextSibling;
			}
			// else {
			// 	// __operation += ` -> unchanged`;
			// 	childNode = next;
			// }

			childNode = next;

			// childNode = newEl.nextSibling;
		}
		// else {
		// 	// childNode = next;
		// 	// if (index!=null) {
		// 	// 	old._el = prev;
		// 	// 	oldChildren[index] = old;
		// 	// 	// oldChildren[index] = old;
		// 	// }
		// 	__operation += ` -> unrendered ${index!=null ? `(index: ${index})` : '' } ${old} ${old && old._el}`;
		// 	// childNode = next;
		// }

		// let newEl = diff(old==null ? null : old._el, node, child, old, context, isSvg, false, excessChildren);
		// if (old==null || newEl!==childNode || newEl.parentNode==null) {
		// 	// node.insertBefore(child._el, oldChildren[i] ? oldChildren[i]._el : null);
		// 	if (newEl===nextChild) {
		// 		nextChild = nextChild.nextSibling;
		// 		childNode.remove();
		// 	}
		// 	else {
		// 		node.insertBefore(newEl, childNode);
		// 	}
		// 	// node.insertBefore(child._el, node.childNodes[i]);
		// 	// node.insertBefore(child._el, oldInPlaceChild);
		// 	// continue;
		// }

		// if (old==null || old.index!==i) {
		// 	// node.insertBefore(child._el, oldChildren[i] ? oldChildren[i]._el : null);
		// 	node.insertBefore(child._el, node.childNodes[i]);
		// 	// node.insertBefore(child._el, oldInPlaceChild);
		// 	// continue;
		// }

		// if (previousNode) {
		// 	// console.log('updating child in place', old, child);
		// 	diff(old._el, node, child, old, context, isSvg, false, excessChildren);
		// 	if (old.index!==i) {
		// 		node.insertBefore(child._el, previousNode);
		// 		// node.insertBefore(child._el, oldInPlaceChild);
		// 		// continue;
		// 	}
		// }
		// else {
		// 	// let created = create(null, node, child, context, isSvg);
		// 	let created = diff(null, node, child, null, context, isSvg, false, excessChildren);
		// 	if (created!=null) {
		// 		// node.insertBefore(created, old._el);
		// 		node.insertBefore(created, oldInPlaceChild);
		// 	}
		// }

		// childNode = nextChild;
		// childNode = newEl.nextSibling;
	}

	// console.log(oldChildren.slice(), children.slice());

	// console.log(excessChildren!=null && excessChildren.slice());
	if (excessChildren!=null) for (i=excessChildren.length; i--; ) if (excessChildren[i]!=null) excessChildren[i].remove();

	// for (let i in seen) if (seen[i] != null && (c = seen[i]._el)) c.remove();
	for (i=oldChildren.length; i--; ) if (oldChildren[i]!=null) unmount(oldChildren[i]);
	// for (let i in seen) {
	// 	if (seen[i]!=null) {
	// 		// console.log(seen[i]._el);
	// 		unmount(seen[i]);
	// 	}
	// }
}

/*
export function create(node, parent, vnode, context, isSvg) {
	// let old = node;

	if (typeof vnode.tag==='function') {
		return diff(node, parent, vnode, null, context, isSvg);
	}
	else if (vnode.type===3) {
		if (node==null || node.nodeType!==3) {
			node = document.createTextNode(vnode.text);
		}
		else {
			node.data = vnode.text;
		}
	}
	else {
		isSvg = vnode.tag === 'svg' ? true : vnode.tag === 'foreignObject' ? false : isSvg;

		// diff(null, parent, vnode, oldVNode);
		// if (node==null || node.localName!==vnode.tag) {
		node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag) : document.createElement(vnode.tag);
		// if (vnode.props!=null) {
		// 	diffProps(node, vnode.props, EMPTY_OBJ, isSvg);
		// }
		// let children = getVNodeChildren(vnode);
		// for (let i=0; i<children.length; i++) {
		// 	let child = create(null, node, children[i], context, isSvg);
		// 	if (child!=null) {
		// 		node.appendChild(child);
		// 	}
		// }
	}

	// if (parent!=null && old!=null && node!==old) {
	// 	parent.replaceChild(node, old);
	// }

	// if (parent!=null && node!==old) {
	// 	// if (old==null) console.log(parent, node, old);
	// 	if (old==null) parent.appendChild(node);
	// 	else parent.replaceChild(node, old);
	// }

	return vnode._el = node;
}
*/
