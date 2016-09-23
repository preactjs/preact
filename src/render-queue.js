import options from './options';
import { defer } from './util';
import { renderComponent } from './vdom/component';

/** Managed queue of dirty components to be re-rendered */

// items/itemsOffline swap on each rerender() call (just a simple pool technique)
let items = [],
	itemsOffline = [];

export function enqueueRender(component) {
	component._dirty = true;
	if (items.push(component)==1) {
		(options.debounceRendering || defer)(rerender);
	}
}


export function rerender() {
	if (!items.length) return;

	let currentItems = items,
		p;

	// swap online & offline
	items = itemsOffline;
	itemsOffline = currentItems;

	while ( (p = currentItems.pop()) ) {
		if (p._dirty) renderComponent(p);
	}
}
