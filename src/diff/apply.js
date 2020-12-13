import { getDomSibling } from '../component';
import {
	FLAG_PLACEMENT,
	FLAG_UPDATE,
	FLAG_MOUNT,
	FLAG_UNMOUNT,
	EMPTY_OBJ,
	FLAG_NONE
} from '../constants';
import options from '../options';
import { diffProps, setProperty } from './props';
import { applyRef } from './index';
import { removeNode } from '../util';

/**
 *
 * @param {import('../internal').PreactElement} parentDom
 * @param {import('../internal').PreactElement} newDom
 * @param {import('../internal').PreactElement} siblingDom
 */
function placeDom(parentDom, newDom, siblingDom) {
	if (
		newDom.parentNode !== parentDom ||
		(siblingDom == null && newDom.nextSibling !== null) ||
		(siblingDom != null && newDom.nextSibling !== siblingDom)
	) {
		console.log(
			'    place inner',
			parentDom,
			newDom.parentNode !== parentDom,
			siblingDom != null && newDom.nextSibling !== siblingDom
		);
		if (siblingDom != null) {
			console.log('      --> insert', newDom, 'before', siblingDom);
			parentDom.insertBefore(newDom, siblingDom);
		} else {
			console.log('      --> append', newDom);
			parentDom.appendChild(newDom);
		}
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
	console.log('    --> unmount', vnode.type, vnode._dom);

	if ((r = vnode.ref)) {
		if (!r.current || r.current === vnode._dom) applyRef(r, null, parentVNode);
	}

	let dom;
	if (!skipRemove && typeof vnode.type != 'function') {
		skipRemove = (dom = vnode._dom) != null;
	}

	// Must be set to `undefined` to properly clean up `_nextDom`
	// for which `null` is a valid value. See comment in `create-element.js`
	vnode._dom = vnode._nextDomf = undefined;

	if ((r = vnode._component) != null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentVNode);
			}
		}

		r.base = r._parentDom = null;
	}

	if ((r = vnode._children)) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], parentVNode, skipRemove);
		}
	}

	if (dom != null) removeNode(dom);
}

/**
 *
 * @param {import('../internal').PreactElement} parentDom
 * @param {import('../internal').VNode} vnode
 * @param {import('../internal').PreactElement} nextDom
 * @param {boolean} isSvg
 * @param {*} commitQueue
 */
function flushNode(parentDom, vnode, nextDom, isSvg, commitQueue) {
	const flags = vnode._flags;
	const newProps = vnode.props == null ? EMPTY_OBJ : vnode.props;
	let oldProps = vnode._oldProps || EMPTY_OBJ;

	if (typeof vnode.type === 'string') {
		isSvg =
			vnode.type === 'foreignObject' ? false : vnode.type === 'svg' || isSvg;

		if (flags & FLAG_MOUNT) {
			oldProps = EMPTY_OBJ;
			vnode._dom = isSvg
				? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
				: document.createElement(
						vnode.type,
						// Custom Elements specific options
						newProps.is && { is: newProps.is }
				  );
		}

		let dom = vnode._dom;
		console.log('  >>> DIFF PROPS');
		diffProps(dom, newProps, oldProps, isSvg, false);

		let i;
		if (newProps !== EMPTY_OBJ) {
			if (
				'value' in newProps &&
				(i = newProps.value) !== undefined &&
				// #2756 For the <progress>-element the initial value is 0,
				// despite the attribute not being present. When the attribute
				// is missing the progress bar is treated as indeterminate.
				// To fix that we'll always update it when it is 0 for progress elements
				(i !== dom.value || (vnode.type === 'progress' && !i))
			) {
				setProperty(dom, 'value', i, oldProps.value, false);
			}
			if (
				'checked' in newProps &&
				(i = newProps.checked) !== undefined &&
				i !== dom.checked
			) {
				setProperty(dom, 'checked', i, oldProps.checked, false);
			}
		}

		nextDom = null;
		parentDom = dom;
	} else if (vnode.type === null) {
		if (flags & FLAG_MOUNT) {
			vnode._dom = document.createTextNode(newProps);
		} else if (flags & FLAG_UPDATE) {
			vnode._dom.data = newProps;
		}
	}

	// Reset flags in case a tree is re-used at a later render pass and
	// something bailed out of rendering.
	vnode._flags = FLAG_NONE;

	let siblingDom = nextDom;
	let lastDom = null;

	const children = vnode._children;
	if (children != null) {
		// Insert nodes in reverse so that we have a valid nextSibling pointer
		for (let i = children.length - 1; i >= 0; i--) {
			const childVNode = children[i];

			if (childVNode == null) {
				continue;
			}

			flushNode(parentDom, childVNode, siblingDom, isSvg, commitQueue);

			if (childVNode._dom != null) {
				if (childVNode._nextDom != null) {
					let dom = childVNode._nextDom;
					while (dom != null && dom !== childVNode._dom) {
						placeDom(parentDom, dom, siblingDom);
						siblingDom = dom;
						dom = dom.previousSibling;
					}
				}

				console.log('place', childVNode.type, childVNode._dom);
				placeDom(parentDom, childVNode._dom, siblingDom);
				siblingDom = childVNode._dom;

				if (lastDom == null) {
					lastDom = siblingDom;
				}
			}
		}
	}

	// Update dom pointers
	if (
		typeof vnode.type === 'function' &&
		lastDom !== null &&
		lastDom !== nextDom
	) {
		console.log('----> SET', vnode.type, siblingDom, lastDom, nextDom);
		vnode._dom = siblingDom;
		if (lastDom !== siblingDom) {
			vnode._nextDom = lastDom;
		}
	}
}

/**
 * @param {import("../internal").PreactElement} parentDom
 * @param {import("../internal").VNode} vnode
 * @param {import("../internal").PreactElement} nextDom
 * @param {any[]} commitQueue
 * @param {any[]} unmountQueue
 * @param {any[]} refs
 * @param {boolean} isHydrating
 */
export function flushToDom(
	parentDom,
	vnode,
	nextDom,
	commitQueue,
	unmountQueue,
	refs,
	isHydrating
) {
	console.log('>>> UNMOUNT', unmountQueue.length);
	unmountQueue.forEach(vnode => unmount(vnode, vnode._parent, false));

	console.log('>>> FLUSH');
	console.log(
		'  start sibling',
		nextDom == null ? getDomSibling(vnode) : nextDom
	);
	flushNode(
		parentDom,
		vnode,
		nextDom == null ? getDomSibling(vnode) : nextDom,
		parentDom.ownerSVGElement !== undefined,
		commitQueue
	);

	// Set refs only after unmount
	console.log('>>> REFS', refs.length);
	for (let i = 0; i < refs.length; i++) {
		let r1 = refs[i];
		let r2 = refs[++i] ? refs[i + 1]._component || refs[i + 1]._dom : null;
		let r3 = refs[++i];
		applyRef(r1, r2, r3);
	}

	if (options._commit) options._commit(vnode, commitQueue);

	commitQueue.some(c => {
		try {
			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some(cb => {
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode);
		}
	});
}
