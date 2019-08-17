import { FilterElementType, FilterDisplayName as FilterName, FilterLocation, FilterHOC } from './constants';
import { Fragment } from '../../../src';
import { getVNodeType, getDisplayName, isRoot } from './vnode';

/**
 * @returns {import('./devtools').FilterState}
 */
export function createFilterManager() {
	return {
		raw: [],
		byType: new Set(),
		byName: new Set(),
		byPath: new Set()
	};
}

/**
 * Update the currently active component filters by unmounting all roots,
 * applying all filters and then remounting all roots again
 * @param {() => Set<any>} getRoots
 * @param {import('./devtools').AdapterState} state
 * @param {import('./devtools').IdMapper} idMapper
 * @param {(vnode: import('../internal').VNode, parentId: number) => void} mount
 * @param {(record: (vnode: import('../internal').VNode) => void, vnode: import('../internal').VNode) => void} unmount
 * @param {(vnode: import('../internal').VNode) => void} recordUnmount
 * @param {() => void} flush
 * @returns {(filters: Array<import('../internal').Filter>) => void}
 */
export const updateComponentFilters = (getRoots, state, idMapper, mount, unmount, recordUnmount, flush) => filters => {
	// Unmount all currently active roots
	getRoots().forEach(root => {
		unmount(recordUnmount, root._children[0]);
		recordUnmount(root._children[0]);
		state.currentRootId = -1;
	});

	updateFilterState(state.filter, filters);

	getRoots().forEach(root => {
		state.currentRootId = idMapper.getId(root);
		mount(root._children[0], state.currentRootId);
		flush();
		state.currentRootId = -1;
	});
};

/**
 * Parse filters and load them into the hook.
 * @param {import('./devtools').FilterState} state
 * @param {Array<import('../internal').Filter>} filters
 */
export function updateFilterState(state, filters) {
	const { byName, byType, byPath } = state;
	byName.clear();
	byType.clear();
	byPath.clear();

	filters.forEach(filter => {
		if (!filter.isEnabled) return;

		switch (filter.type) {
			case FilterElementType:
				byType.add(filter.value);
				break;
			case FilterName:
				if (filter.isValid && filter.value!=='') {
					byName.add(new RegExp(filter.value, 'i'));
				}
				break;
			case FilterLocation:
				if (filter.isValid && filter.value!=='') {
					byPath.add(new RegExp(filter.value, 'i'));
				}
				break;
			case FilterHOC:
				break;
			default:
				console.warn(`Invalid filter type ${/** @type {*} */ (filter).type}`);
		}
	});
}

/**
 * Whether the element should be visible in the devtools panel. Currently only
 * Components are shown.
 * @param {import('./devtools').FilterState} filterState
 * @param {import('../internal').VNode} vnode
 */
export function shouldFilter(filterState, vnode) {
	switch (vnode.type) {
		// TODO: Portals
		// TODO: Root nodes
		case null:
			return true;
		case Fragment:
			return !isRoot(vnode);
	}

	if (filterState.byType.has(getVNodeType(vnode))) {
		return true;
	}

	let name = getDisplayName(vnode);
	for (const regex of filterState.byName) {
		if (regex.test(name)) return true;
	}

	// TODO: By filepath, debugSource

	return false;
}
