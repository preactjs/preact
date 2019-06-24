import { unmount, mount, flushPendingEvents, recordUnmount } from './renderer2';
import { FilterElementType, FilterDisplayName as FilterName, FilterLocation, FilterHOC } from './constants';
import { Fragment } from '../../../src';
import { getVNodeType, getDisplayName, isRoot } from './vnode';
import { getVNodeId } from './cache';

/**
 * Update the currently active component filters by unmounting all roots,
 * applying all filters and then remounting all roots again
 * @param {import('../internal').DevtoolsHook} hook
 * @param {import('../internal').AdapterState} state
 * @returns {(filters: Array<import('../internal').Filter>) => void}
 */
export function updateComponentFilters(hook, state) {
	return filters => {
		// Unmount all currently active roots
		hook.getFiberRoots(state.rendererId).forEach(root => {
			unmount(state, root);
			recordUnmount(state, root);
			state.currentRootId = -1;
		});

		updateFilterState(state.filter, filters);

		hook.getFiberRoots(state.rendererId).forEach(root => {
			state.currentRootId = getVNodeId(root);
			mount(state, root, state.currentRootId);
			flushPendingEvents(hook, state);
			state.currentRootId = -1;
		});
	};
}

/**
 * Parse filters and load them into the hook.
 * @param {import('../internal').AdapterState["filter"]} filterState
 * @param {Array<import('../internal').Filter>} filters
 */
export function updateFilterState(filterState, filters) {
	filterState.byName.clear();
	filterState.byType.clear();
	filterState.byPath.clear();

	filters.forEach(filter => {
		if (!filter.isEnabled) return;

		switch (filter.type) {
			case FilterElementType:
				filterState.byType.add(filter.value);
				break;
			case FilterName:
				if (filter.isValid && filter.value!=='') {
					filterState.byName.add(new RegExp(filter.value, 'i'));
				}
				break;
			case FilterLocation:
				if (filter.isValid && filter.value!=='') {
					filterState.byPath.add(new RegExp(filter.value, 'i'));
				}
				break;
			case FilterHOC:
				break;
			default:
				console.warn(`Invalid filter type ${filter.type}`);
		}
	});
}

/**
 * Whether the element should be visible in the devtools panel. Currently only
 * Components are shown.
 * @param {import('../internal').AdapterState["filter"]} filterState
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
