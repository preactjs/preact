import { coerceToVNode } from '../create-element';
import { EMPTY_ARR, EMPTY_OBJ } from '../constants';
import options from '../options';
import { removeNode } from '../util';
import { diffProps } from './props';
import { getDomSibling } from '../component';

/**
 * 
 * @param {Array<import('../internal').Component>} mounts
 * @param {Array<{ _component: import('../internal').Component, _previousProps: any, _previousState: any, _snapshot: any }>} updates
 * @param {any} root
 */
export function commitRoot(mounts, updates, root) {
	let c;
	while ((c = mounts.shift())) {
		try {
			c.componentDidMount();
		}
		catch (e) {
			options._catchError(e, c._vnode);
		}
	}

	while ((c = updates.shift())) {
		try {
			c._component.componentDidUpdate(c._previousProps, c._previousState, c._snapshot);
		}
		catch (e) {
			options._catchError(e, c._component._vnode);
		}
	}

	if (options._commit) options._commit(root);
}

/**
 * Commit a rendered tree
 * @param {import('../internal').PreactElement} parentDom DOM node to commit into
 * @param {import('../internal').VNode} newParentVNode VNode to commit
 * @param {import('../internal').VNode} oldParentVNode VNode of the previous commit
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} mounts
 * @param {Array<{ _component: import('../internal').Component, _previousProps: any, _previousState: any, _snapshot: any }>} updates
 * @param {Element | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 */
export default function commit(parentDom, newParentVNode, isSvg, excessDomChildren, mounts, updates, oldDom, isHydrating, callsite) {
	// TODO: get rid of this flag. We might be able to replace it with an equality check (newParentVNode == oldParentVNode)
	// if (newParentVNode._shouldComponentUpdate === false) {
	// 	return;
	// }
	if (newParentVNode._shouldComponentUpdate === false) {
		newParentVNode._dom = newParentVNode._oldVNode._dom;
		return;
	}

	if (newParentVNode._component) {
		newParentVNode._component._parentDom = parentDom;
	}
	let childVNode, i, j, newDom, sibDom, firstChildDom, refs, snapshot;
  
	let newChildren = newParentVNode._children;
	// This is a compression of newParentVNode._oldVNode!=null && newParentVNode._oldVNode != EMPTY_OBJ && newParentVNode._oldVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = (newParentVNode._oldVNode && newParentVNode._oldVNode._children) || EMPTY_ARR;
  
	let oldChildrenLength = oldChildren.length;

	// Only in very specific places should this logic be invoked (top level `render` and `diffElementNodes`).
	// I'm using `EMPTY_OBJ` to signal when `diffChildren` is invoked in these situations. I can't use `null`
	// for this purpose, because `null` is a valid value for `oldDom` which can mean to skip to this logic
	// (e.g. if mounting a new tree in which the old DOM should be ignored (usually for Fragments).
	if (oldDom === EMPTY_OBJ) {
		if (excessDomChildren != null) {
			oldDom = excessDomChildren[0];
		}
		else if (oldChildrenLength) {
			oldDom = getDomSibling(newParentVNode._oldVNode, 0);
		}
		else {
			oldDom = null;
		}
	}
  
	if (
		typeof newParentVNode.type === 'function'
	) {
		if (newParentVNode._component) {
			if (newParentVNode._component._isNew) {
				newParentVNode._component._isNew = false;

				if (newParentVNode._component.componentDidMount) {
					mounts.push(newParentVNode._component);
				}
			}
			else {
				// TODO: validate that if one of these two is given, both should be...
				if (newParentVNode._component.getSnapshotBeforeUpdate) {
					try {
						snapshot = newParentVNode._component.getSnapshotBeforeUpdate(newParentVNode._oldVNode.props, newParentVNode._oldVNode._component._previousState);
					}
					catch (e) {
						options._catchError(e, newParentVNode, newParentVNode._oldVNode);
					}
				}

				if (newParentVNode._component.componentDidUpdate) {
					updates.push({
						_component: newParentVNode._component,
						_previousProps: newParentVNode._oldVNode.props,
						_previousState: newParentVNode._oldVNode._component._previousState,
						_snapshot: snapshot
					});
				}
			}
		}
	}

	for (i = 0; i < (newChildren ? newChildren.length : 0); i++) {
		childVNode = newChildren[i] = coerceToVNode(newChildren[i], false);

		// TODO: find a way to have this check only in one place...
		// JSON injection protection
		if (childVNode && childVNode.constructor !== undefined) return null;
  
		if (childVNode != null) {
			childVNode._parentDom = parentDom;

			oldChildren[oldChildren.indexOf(childVNode._oldVNode)] = null;

			let newMounts = [], newUpdates = [];
			if (typeof childVNode.type === 'function') {
				// TODO: only proceed if we changed that vnode
				commit(
					parentDom,
					childVNode,
					isSvg,
					excessDomChildren,
					newMounts,
					newUpdates,
					oldDom,
					isHydrating,
					'function child'
				);
			}
			else if (
				typeof childVNode.type === 'string' || childVNode.type === null
			) {
				childVNode._dom = diffElementNodes(
					childVNode._oldVNode._dom,
					childVNode,
					isSvg,
					excessDomChildren,
					newMounts,
					newUpdates,
					isHydrating,
					'string|null child'
				);
				// TODO: only append if not yet appended!
			}

			// miss-use of j for the sake of the bytes
			while (j = newMounts.pop()) { mounts.push(j); }
			while (j = newUpdates.pop()) { updates.push(j); }
			
			newDom = childVNode._dom;
  
			if ((j = childVNode.ref) && childVNode._oldVNode.ref != j) {
				(refs || (refs = [])).push(
					j,
					childVNode._component || newDom,
					childVNode
				);
			}
  
			// Only proceed if the vnode has not been unmounted by `diff()` above.
			if (newDom != null) {
				if (firstChildDom == null) {
					firstChildDom = newDom;
				}
	
				if (childVNode._lastDomChild != null) {
				// Only Fragments or components that return Fragment like VNodes will
				// have a non-null _lastDomChild. Continue the diff from the end of
				// this Fragment's DOM tree.
					newDom = childVNode._lastDomChild;
	
					// Eagerly cleanup _lastDomChild. We don't need to persist the value because
					// it is only used by `diffChildren` to determine where to resume the diff after
					// diffing Components and Fragments.
					childVNode._lastDomChild = null;
				}
				else if (
					excessDomChildren == childVNode._oldVNode ||
					newDom != oldDom ||
					newDom.parentNode == null
				) {
					// NOTE: excessDomChildren==oldVNode above:
					// This is a compression of excessDomChildren==null && oldVNode==null!
					// The values only have the same type when `null`.
					outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
						parentDom.appendChild(newDom);
					}
					else {
						// `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
						for (
							sibDom = oldDom, j = 0;
							(sibDom = sibDom.nextSibling) && j < oldChildrenLength;
							j += 2
						) {
							if (sibDom == newDom) {
								break outer;
							}
						}
						parentDom.insertBefore(newDom, oldDom);
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
					if (newParentVNode.type == 'option') {
						parentDom.value = '';
					}
				}

				oldDom = newDom.nextSibling;
	
				if (typeof newParentVNode.type == 'function') {
				// At this point, if childVNode._lastDomChild existed, then
				// newDom = childVNode._lastDomChild per line 101. Else it is
				// the same as childVNode._dom, meaning this component returned
				// only a single DOM node
					newParentVNode._lastDomChild = newDom;
				}
			}
		}
	}

	newParentVNode._dom = firstChildDom;
  
	// Remove children that are not part of any vnode.
	if (excessDomChildren != null && typeof newParentVNode.type !== 'function')
		for (i = excessDomChildren.length; i--; )
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
  
	// Remove remaining oldChildren if there are any.
	for (i = oldChildrenLength; i--; )
		if (oldChildren[i] != null) unmount(oldChildren[i], oldChildren[i]);
  
	// Set refs only after unmount
	if (refs) {
		for (i = 0; i < refs.length; i++) {
			applyRef(refs[i], refs[++i], refs[++i]);
		}
	}

	if (options.committed) {
		options.committed(newParentVNode, mounts);
	}
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} mounts An array of newly
 * mounted components
 * @param {Array<{ _component: import('../internal').Component, _previousProps: any, _previousState: any, _snapshot: any }>} updates
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(
	dom,
	newVNode,
	isSvg,
	excessDomChildren,
	mounts,
	updates,
	isHydrating
) {
	let i;
	let oldProps = newVNode._oldVNode.props;
	let newProps = newVNode.props;
  
	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = newVNode.type === 'svg' || isSvg;
  
	if (dom == null && excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			const child = excessDomChildren[i];
			if (
				child != null &&
				(newVNode.type === null
					? child.nodeType === 3
					: child.localName === newVNode.type)
			) {
				dom = child;
				excessDomChildren[i] = null;
				break;
			}
		}
	}
  
	if (dom == null) {
		if (newVNode.type === null) {
			return document.createTextNode(newProps);
		}
		dom = isSvg
			? document.createElementNS('http://www.w3.org/2000/svg', newVNode.type)
			: document.createElement(newVNode.type);
		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
	}
  
	if (newVNode.type === null) {
		if (excessDomChildren!=null) excessDomChildren[excessDomChildren.indexOf(dom)] = null;
		if (oldProps !== newProps) {
			dom.data = newProps;
		}
	}
	else if (newVNode !== newVNode._oldVNode) {
		if (excessDomChildren != null) {
			excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}
  
		oldProps = newVNode._oldVNode.props || EMPTY_OBJ;
  
		let oldHtml = oldProps.dangerouslySetInnerHTML;
		let newHtml = newProps.dangerouslySetInnerHTML;
  
		// During hydration, props are not diffed at all (including dangerouslySetInnerHTML)
		// @TODO we should warn in debug mode when props don't match here.
		if (!isHydrating) {
			if (newHtml || oldHtml) {
				// Avoid re-applying the same '__html' if it did not changed between re-render
				if (!newHtml || !oldHtml || newHtml.__html != oldHtml.__html) {
					dom.innerHTML = (newHtml && newHtml.__html) || '';
				}
			}
		}
  
		diffProps(dom, newProps, oldProps, isSvg, isHydrating);
  
		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (!newHtml) {
			commit(
				dom,
				newVNode,
				newVNode.type === 'foreignObject' ? false : isSvg,
				excessDomChildren,
				mounts,
				updates,
				EMPTY_OBJ,
				isHydrating,
				'diffElementNodes'
			);
		}
  
		// (as above, don't diff props during hydration)
		if (!isHydrating) {
			if (
				'value' in newProps &&
          newProps.value !== undefined &&
          newProps.value !== dom.value
			)
				dom.value = newProps.value == null ? '' : newProps.value;
			if (
				'checked' in newProps &&
          newProps.checked !== undefined &&
          newProps.checked !== dom.checked
			)
				dom.checked = newProps.checked;
		}
	}
  
	return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').VNode} vnode
 */
export function applyRef(ref, value, vnode) {
	try {
		if (typeof ref=='function') ref(value);
		else ref.current = value;
	}
	catch (e) {
		options._catchError(e, vnode, undefined);
	}
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').VNode} vnode The virtual node to unmount
 * @param {import('../internal').VNode} parentVNode The parent of the VNode that
 * initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(vnode, parentVNode, skipRemove) {
	let r;
	if (options.unmount) options.unmount(vnode);

	if (r = vnode.ref) {
		applyRef(r, null, parentVNode);
	}

	let dom;
	if (!skipRemove && typeof vnode.type !== 'function') {
		skipRemove = (dom = vnode._dom)!=null;
	}

	vnode._dom = vnode._lastDomChild = null;

	if ((r = vnode._component)!=null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			}
			catch (e) {
				options._catchError(e, parentVNode, undefined);
			}
		}

		r.base = r._parentDom = null;
	}

	if (r = vnode._children) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], parentVNode, skipRemove);
		}
	}

	if (dom!=null) removeNode(dom);
}