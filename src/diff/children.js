import { diff, unmount, applyRef } from './index';
import { createVNode, Fragment } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { removeNode } from '../util';
import { getDomSibling } from '../component';
import { printVNode } from './test-utils';

let nextId = 1; // Start from 1 so a valid _key is always > 0
const TYPES = new Map();
const KEYS = new Map();

function getKey(type, key) {
	const map = key == null ? TYPES : KEYS;
	const value = key == null ? type : key;
	let id = map.get(value);
	if (!id) {
		map.set(value, (id = nextId++));
	}
	return id;
}

// A comparison function for sorting VNodes/Internals primarily by _key,
// secondarily by _index.
// Apparently normalizeChildren can return undefined values, so sort them
// to the end of the array.
function byKey(a, b) {
	if (!a) return b ? 1 : 0;
	else if (!b) return -1;
	return a._key - b._key || a._index - b._index;
}

function byIndex(a, b) {
	if (a == null || b == null) return 0;
	return a._index - b._index;
}

// Reorder an array (of VNodes/Internals) back to its original order,
// according to their _index values, in O(n) time.
// Note that this assumes that it's ok to put null where there originally
// was undefined, and vice versa.
function reorder(array) {
	for (let i = 0; i < array.length; i++) {
		let item = array[i];
		while (item && item._index !== i) {
			array[i] = array[item._index];
			array[item._index] = item;
			item = array[i];
		}
	}
}

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../index').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual
 * node whose children should be diff'ed against newParentVNode
 * @param {object} globalContext The current context object - modified by getChildContext
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {Element | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 */
export function diffChildren(
	parentDom,
	renderResult,
	newParentVNode,
	oldParentVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let i, j, oldVNode, childVNode, newDom, firstChildDom, refs;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	let oldChildrenLength = oldChildren.length;

	// Only in very specific places should this logic be invoked (top level `render` and `diffElementNodes`).
	// I'm using `EMPTY_OBJ` to signal when `diffChildren` is invoked in these situations. I can't use `null`
	// for this purpose, because `null` is a valid value for `oldDom` which can mean to skip to this logic
	// (e.g. if mounting a new tree in which the old DOM should be ignored (usually for Fragments).
	if (oldDom == EMPTY_OBJ) {
		if (excessDomChildren != null) {
			oldDom = excessDomChildren[0];
		} else if (oldChildrenLength) {
			oldDom = getDomSibling(oldParentVNode, 0);
		} else {
			oldDom = null;
		}
	}

	// console.log('>>>>', oldChildren.length, renderResult.length);

	let isKeyedDiff = false;
	newParentVNode._children = [];
	for (i = 0; i < renderResult.length; i++) {
		childVNode = renderResult[i];

		if (childVNode == null || typeof childVNode == 'boolean') {
			childVNode = newParentVNode._children[i] = null;
		}
		// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
		// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
		// it's own DOM & etc. pointers
		else if (typeof childVNode == 'string' || typeof childVNode == 'number') {
			childVNode = newParentVNode._children[i] = createVNode(
				null,
				childVNode,
				null,
				null,
				childVNode
			);
		} else if (Array.isArray(childVNode)) {
			childVNode = newParentVNode._children[i] = createVNode(
				Fragment,
				{ children: childVNode },
				null,
				null,
				null
			);
		} else if (
			childVNode._index != null ||
			childVNode._dom != null || // TODO: Can this be removed?
			childVNode._component != null
		) {
			childVNode = newParentVNode._children[i] = createVNode(
				childVNode.type,
				childVNode.props,
				childVNode.key,
				null,
				childVNode._original
			);
		} else {
			childVNode = newParentVNode._children[i] = childVNode;
		}

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if (childVNode == null) {
			continue;
		}

		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;

		childVNode._index = i;
		isKeyedDiff = isKeyedDiff || (childVNode.props && childVNode.props.key);

		childVNode._key = getKey(
			childVNode.type,
			childVNode.type == null || childVNode.props == null
				? null
				: childVNode.props.key
		);
		childVNode._match = -1;
	}

	const parentChildren = newParentVNode._children;

	// console.log('    MATCH', parentChildren.length, oldChildrenLength);
	if (isKeyedDiff) {
		// Find matching newVNode -> oldVNode pairs.
		oldChildren.sort(byKey);
		parentChildren.sort(byKey);
		for (
			let n = 0, o = 0;
			n < parentChildren.length &&
			o < oldChildrenLength &&
			(childVNode = parentChildren[n]);

		) {
			const oldVNode = oldChildren[o] || EMPTY_OBJ;
			// console.log(
			// 	'        ',
			// 	n,
			// 	o,
			// 	'new key',
			// 	childVNode._key,
			// 	printVNode(childVNode),
			// 	'old key',
			// 	oldVNode && oldVNode._key,
			// 	printVNode(oldVNode)
			// );
			if (childVNode._key === oldVNode._key) {
				// console.log('           match', oldVNode._index);
				childVNode._match = oldVNode._index;
				oldVNode._match = -2;
				n++;
				o++;
			} else if (childVNode._key < oldVNode._key) {
				n++;
			} else {
				o++;
			}
		}
		oldChildren.sort(byIndex);
		parentChildren.sort(byIndex);
	} else {
		for (i = 0; i < parentChildren.length && i < oldChildrenLength; i++) {
			childVNode = parentChildren[i];
			const oldVNode = oldChildren[i] || EMPTY_OBJ;
			// console.log(
			// 	'      unkeyed ' + i,
			// 	childVNode && childVNode._key,
			// 	oldVNode._key
			// );
			if (childVNode !== null && childVNode._key === oldVNode._key) {
				childVNode._match = oldVNode._index;
				oldVNode._match = -2;
			}
		}
	}

	// console.log(
	// 	'    MATCHES',
	// 	parentChildren.map(x => x && x._match)
	// );

	// console.log(
	// 	'    NEW',
	// 	parentChildren.map(x => printVNode(x)),
	// 	Array.from(new Set(parentChildren)).map(x => printVNode(x))
	// );
	// console.log(
	// 	'    OLD',
	// 	oldChildren.map(x => printVNode(x)),
	// 	Array.from(new Set(oldChildren.map(x => (x == null ? 'null' : x)))).map(x =>
	// 		printVNode(x)
	// 	)
	// );

	// Remove remaining oldChildren if there are any.
	for (i = 0; i < oldChildrenLength; i++) {
		if (oldChildren[i] !== null) {
			// console.log(
			// 	'    > check unmount ' + i,
			// 	printVNode(oldChildren[i]),
			// 	oldChildren[i]._match
			// );
		}
		if (oldChildren[i] != null && oldChildren[i]._match !== -2) {
			// If we happen to unmount the vnode which hosts our oldDom pointer
			// we need to re-query it after all unmounts are done.
			if (oldDom === oldChildren[i]._dom) {
				// console.log('OH NO', oldDom, oldDom && oldDom.previousSibling);
				// console.log('    ', oldChildren[i]._nextDom);
				oldDom = oldChildren[i]._nextDom || oldDom ? oldDom.nextSibling : null;
			}
			// console.log(
			// 	'--> unmount',
			// 	i,
			// 	printVNode(oldChildren[i]),
			// 	oldChildren[i]._matched
			// );
			unmount(oldChildren[i], oldChildren[i]);
		}
	}

	// console.log('      EXCESS', excessDomChildren);

	// Now we can start the actual diff
	for (i = 0; i < parentChildren.length; i++) {
		childVNode = parentChildren[i];
		if (childVNode == null) continue;

		oldVNode =
			childVNode._match > -1
				? oldChildren[childVNode._match] || EMPTY_OBJ
				: EMPTY_OBJ;
		// oldDom = oldVNode._dom || oldDom;
		// if (oldVNode == null) {
		// 	console.log(childVNode && childVNode._match, oldChildren);
		// }
		// console.log(
		// 	'    DIFF',
		// 	printVNode(childVNode),
		// 	oldVNode === EMPTY_OBJ ? 'EMTPY' : printVNode(oldVNode)
		// );
		// console.log('    match', childVNode._match);
		// console.log('      oldDom', oldDom);

		// Morph the old element into the new one, but don't append it to the dom yet
		diff(
			parentDom,
			childVNode,
			oldVNode || EMPTY_OBJ,
			globalContext,
			isSvg,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating
		);

		newDom = childVNode._dom;
		// if (newDom === undefined) {
		// 	console.log(childVNode);
		// }
		// console.log('    newDom', newDom, r);

		if ((j = childVNode.ref) && oldVNode.ref != j) {
			if (!refs) refs = [];
			if (oldVNode.ref) refs.push(oldVNode.ref, null, childVNode);
			refs.push(j, childVNode._component || newDom, childVNode);
		}

		if (newDom != null) {
			if (firstChildDom == null) {
				firstChildDom = newDom;
			}

			if (
				typeof childVNode.type == 'function' &&
				childVNode._children === oldVNode._children
			) {
				// console.log('    REORDER', printVNode(childVNode));
				childVNode._nextDom = oldDom = reorderChildren(
					childVNode,
					oldDom,
					parentDom
				);
			} else {
				// console.log('    PLACE', printVNode(childVNode), printVNode(oldVNode));
				oldDom = placeChild(
					parentDom,
					childVNode,
					oldVNode,
					oldChildren,
					excessDomChildren,
					newDom,
					oldDom
				);
			}

			// Browsers will infer an option's `value` from `textContent` when
			// no value is present. This essentially bypasses our code to set it
			// later in `diff()`. It works fine in all browsers except for IE11
			// where it breaks setting `select.value`. There it will be always set
			// to an empty string. Re-applying an options value will fix that, so
			// there are probably some internal data structures that aren't
			// updated properly.
			//
			// To fix it we make sure to reset the inferred value, so that our own
			// value check in `diff()` won't be skipped.
			if (!isHydrating && newParentVNode.type == 'option') {
				parentDom.value = '';
			} else if (typeof newParentVNode.type == 'function') {
				// Because the newParentVNode is Fragment-like, we need to set it's
				// _nextDom property to the nextSibling of its last child DOM node.
				//
				// `oldDom` contains the correct value here because if the last child
				// is a Fragment-like, then oldDom has already been set to that child's _nextDom.
				// If the last child is a DOM VNode, then oldDom will be set to that DOM
				// node's nextSibling.
				newParentVNode._nextDom = oldDom;
			}
		} else if (
			oldDom &&
			oldVNode._dom == oldDom &&
			oldDom.parentNode != parentDom
		) {
			// The above condition is to handle null placeholders. See test in placeholder.test.js:
			// `efficiently replace null placeholders in parent rerenders`
			oldDom = getDomSibling(oldVNode);
		}
	}

	newParentVNode._dom = firstChildDom;

	// Remove children that are not part of any vnode.
	if (excessDomChildren != null && typeof newParentVNode.type != 'function') {
		for (i = excessDomChildren.length; i--; ) {
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
		}
	}

	// Set refs only after unmount
	if (refs) {
		for (i = 0; i < refs.length; i++) {
			applyRef(refs[i], refs[++i], refs[++i]);
		}
	}
}

function reorderChildren(childVNode, oldDom, parentDom) {
	for (let tmp = 0; tmp < childVNode._children.length; tmp++) {
		let vnode = childVNode._children[tmp];
		if (vnode) {
			vnode._parent = childVNode;

			if (typeof vnode.type == 'function') {
				reorderChildren(vnode, oldDom, parentDom);
			} else {
				console.log('    --> reorder to place');
				oldDom = placeChild(
					parentDom,
					vnode,
					vnode,
					childVNode._children,
					null,
					vnode._dom,
					oldDom
				);
			}
		}
	}

	return oldDom;
}

/**
 * Flatten and loop through the children of a virtual node
 * @param {import('../index').ComponentChildren} children The unflattened
 * children of a virtual node
 * @returns {import('../internal').VNode[]}
 */
export function toChildArray(children, out) {
	out = out || [];
	if (children == null || typeof children == 'boolean') {
	} else if (Array.isArray(children)) {
		children.some(child => {
			toChildArray(child, out);
		});
	} else {
		out.push(children);
	}
	return out;
}

function placeChild(
	parentDom,
	childVNode,
	oldVNode,
	oldChildren,
	excessDomChildren,
	newDom,
	oldDom
) {
	let nextDom;
	if (childVNode._nextDom !== undefined) {
		// Only Fragments or components that return Fragment like VNodes will
		// have a non-undefined _nextDom. Continue the diff from the sibling
		// of last DOM child of this child VNode
		nextDom = childVNode._nextDom;

		// Eagerly cleanup _nextDom. We don't need to persist the value because
		// it is only used by `diffChildren` to determine where to resume the diff after
		// diffing Components and Fragments. Once we store it the nextDOM local var, we
		// can clean up the property
		childVNode._nextDom = undefined;
	} else if (
		excessDomChildren == oldVNode ||
		newDom != oldDom ||
		newDom.parentNode == null
	) {
		// NOTE: excessDomChildren==oldVNode above:
		// This is a compression of excessDomChildren==null && oldVNode==null!
		// The values only have the same type when `null`.

		outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
			// console.log(
			// 	'--> append',
			// 	'new',
			// 	newDom,
			// 	'old',
			// 	oldDom,
			// 	oldDom && oldDom.parentNode,
			// 	parentDom
			// );
			parentDom.appendChild(newDom);
			nextDom = null;
		} else {
			// `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
			for (
				let sibDom = oldDom, j = 0;
				(sibDom = sibDom.nextSibling) && j < oldChildren.length;
				j += 2
			) {
				if (sibDom == newDom) {
					// console.log('--> NO reorder');
					break outer;
				}
			}
			// console.log('--> insert', newDom, 'before', oldDom);
			parentDom.insertBefore(newDom, oldDom);
			nextDom = oldDom;
		}
	}

	// If we have pre-calculated the nextDOM node, use it. Else calculate it now
	// Strictly check for `undefined` here cuz `null` is a valid value of `nextDom`.
	// See more detail in create-element.js:createVNode
	if (nextDom !== undefined) {
		oldDom = nextDom;
	} else {
		oldDom = newDom.nextSibling;
	}

	return oldDom;
}
