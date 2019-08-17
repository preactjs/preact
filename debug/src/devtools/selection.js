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
		if (item==null) continue;
		if (getDisplayName(item)!=seg.displayName) break;

		if (!shouldFilter(filters, item)) {
			lastNonFiltered = item;
		}
	}

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
 * @param {import('../internal').SelectionState} state
 * @param {Array<import('../internal').PathFrame>} path
 */
export function setTrackedPath(state, path) {
	if (path==null) {
		state.trackedPath = null;
		state.trackedVNode = null;
	}
	else {
		state.trackedPath = path;
	}
}

/**
 *
 * @param {import('./devtools').FilterState} filters
 * @param {import('./devtools').IdMapper} idMapper
 * @param {() => Set<import('../internal').VNode>} getRoots
 */
export function createSelectionStore(idMapper, filters, getRoots) {

	/** @type {import('../internal').SelectionState} */
	let state = {
		trackedPath: null,
		trackedVNode: null
	};

	return {
		setTrackedPath: path => setTrackedPath(state, path),
		getBestMatch: () => {
			let path = state.trackedPath;
			if (path && path.length > 0) {
				// Search for the correct root
				getRoots().forEach(root => {
					let name = getNearestDisplayName(root);
					if (name===path[0].displayName) {
						state.trackedVNode = root;
					}
				});
			}
			return getBestMatch(idMapper, filters, state.trackedPath, state.trackedVNode);
		}
	};
}
