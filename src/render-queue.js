import options from './options';
import { defer } from './util';
import { renderComponent } from './vdom/component';

/**
 * Managed queue of dirty components to be re-rendered
 * @type {Array<import('./component').Component>}
 */
let items = [];

/**
 * Enqueue a rerender of a component
 * @param {import('./component').Component} component The component to rerender
 * @param {object} props The next props
 * @param {object} context The next context
 */
export function enqueueRender(component,props,context) {
	if (!component._dirty && (component._dirty = true) && items.push([component, props, context])==1) {
		(options.debounceRendering || defer)(rerender);
	}
}

/** Rerender all enqueued dirty components */
export function rerender() {
	let p;
	while ( (p = items.pop()) ) {
		if (p[0]._dirty) renderComponent(p[0], p[1], p[2]);
	}
}
