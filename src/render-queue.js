import options from './options';
import { defer } from './util';
import { renderComponent } from './vdom/component';

/** Managed queue of dirty components to be re-rendered */

let items = [];

export function enqueueRender(component) {
	if (!component._dirty && (component._dirty = true) && items.push(component)==1) {
		(options.debounceRendering || defer)(rerender);
	}
}


export function rerender() {
	let p, list = items;
	items = [];
	while ( (p = list.pop()) ) {
		if (p._dirty) renderComponent(p);
	}
}
