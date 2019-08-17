import { getInstance, getDevtoolsType, getDisplayName, isRoot, getNearestDisplayName, getVNodeProps, getRenderedChildren, getParent, getVNodeType } from './vnode';
import { ElementTypeClass, ElementTypeFunction, ElementTypeForwardRef, ElementTypeMemo } from './constants';
import { shouldFilter } from './filter';

/**
 * Store the devtools selection
 * @param {(id: number) => import('../internal').VNode | null} getVNode
 * @returns {(id: number) => void}
 */
export const selectElement = (getVNode) => (id) => {
	let vnode = getVNode(id);
	if (vnode==null) {
		console.warn(`vnode with id ${id} not found`);
		return;
	}

	/** @type {import('../internal').DevtoolsWindow} */
	let win = /** @type {*} */ (window);

	switch (getDevtoolsType(vnode)) {
		case ElementTypeClass:
			win.$r = getInstance(vnode);
			break;
		case ElementTypeFunction:
		case ElementTypeForwardRef:
		case ElementTypeMemo:
			win.$r = {
				type: getVNodeType(vnode),
				props: getVNodeProps(vnode)
			};
			break;
		/* istanbul ignore next */
		default:
			win.$r = null;
	}
};

/**
 * Get the closest vnode that's known to the store.
 *
 * This function is quite different from the one found in the react adapter
 * reason for that is that our adapter is not part of the extension itself and
 * thus we can't keep references around when a reload occurs. So instead we'll
 * walk the path downwards from the given root and try to match them.
 *
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').FilterState} filters
 * @param {Array<import('../internal').PathFrame>} path Path to match against
 * @param {import('../internal').VNode | null} vnode Root vnode to traverse
 * @returns {import('../internal').PathMatch | null}
 */
export function getBestMatch(idMapper, filters, path, vnode) {
	// Bail out if we don't have a path or a vnode reference
	if (path==null || vnode==null) return null	;

	let item = vnode;
	let lastNonFiltered = null;
	for (let i = 0; i < path.length; i++) {
		let seg = path[i];
		item = getRenderedChildren(item)[seg.index];
		/* istanbul ignore next */
		if (item==null) break;
		/* istanbul ignore next */
		if (getDisplayName(item)!=seg.displayName) break;
		/* istanbul ignore next */
		if (!shouldFilter(filters, item)) {
			lastNonFiltered = item;
		}
	}

	/* istanbul ignore next */
	if (item==null) return null;

	return {
		id: idMapper.getId(lastNonFiltered),
		 // Setting this to true breaks selection more often
		isFullMatch: false
	};
}

/**
 * Get the path to a vnode (used for selection)
 * @param {import('./devtools').IdMapper} idMapper
 * @returns {(id: number) => Array<import('../internal').PathFrame> | null}
 */
export const getVNodePath = idMapper => id => {
	let vnode = idMapper.getVNode(id);
	if (vnode==null) return null;

	let path = [];

	while (vnode!=null && !isRoot(vnode)) {
		path.push(getPathFrame(vnode));
		vnode = getParent(vnode);
	}

	return path.reverse();
};

/**
 * Convert a vnode to a path segment
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').PathFrame}
 */
export function getPathFrame(vnode) {
	let index = getRenderedChildren(getParent(vnode)).findIndex(child => child===vnode);

	return {
		displayName: getDisplayName(vnode),
		key: vnode.key,
		index
	};
}

/**
 * Manage devtool selections
 * @param {import('./devtools').IdMapper} idMapper
 * @param {import('./devtools').FilterState} filters
 * @param {() => Set<import('../internal').VNode>} getRoots
 */
export function createSelection(idMapper, filters, getRoots) {
	let p = null;
	let vnode = null;

	return {
		setTrackedPath: path => {
			p = path==null ? vnode = null : path;
		},
		getBestMatch: () => {
			if (p && p.length > 0) {
				// Search for the correct root
				getRoots().forEach(root => {
					let name = getNearestDisplayName(root);
					/* istanbul ignore next */
					if (name===p[0].displayName || p[0].name) {
						vnode = root;
					}
				});
			}
			return getBestMatch(idMapper, filters, p, vnode);
		}
	};
}
