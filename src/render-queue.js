import options from './options';
import { setImmediate } from './util';
import { renderComponent } from './vdom/component';

/** Managed queue of dirty components to be re-rendered */

// items/itemsOffline swap on each rerender() call (just a simple pool technique)
let items = [],
	itemsOffline = [];

export function enqueueRender(component) {
	if (items.push(component)!==1) return;

	(options.debounceRendering || setImmediate)(rerender);
}


export function rerender() {
	let currentItems = items,
		len = currentItems.length;
	if (!len) return;
	items = itemsOffline;
	items.length = 0;
	itemsOffline = currentItems;
	while (len--) {
		if (currentItems[len]._dirty) {
			renderComponent(currentItems[len]);
		}
	}
}
