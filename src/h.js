import { VNode } from './vnode';
import options from './options';
import { falsey, isFunction, isString, hashToClassName } from './util';



/** JSX/hyperscript reviver
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 *  @example
 *  /** @jsx h *\/
 *  import { render, h } from 'preact';
 *  render(<span>foo</span>, document.body);
 */
export function h(nodeName, attributes) {
	let children;

	lastSimple = false;

	if (arguments.length>2) {
		normalizeChildren(children = [], arguments, 2);
	}

	if (attributes) {
		if (attributes.children) {
			if (!children) {
				normalizeChildren(children = [], attributes.children, 0);
			}
			delete attributes.children;
		}

		if (!isFunction(nodeName)) {
			// normalize className to class.
			if ('className' in attributes) {
				attributes.class = attributes.className;
				delete attributes.className;
			}

			lastSimple = attributes.class;
			if (lastSimple && !isString(lastSimple)) {
				attributes.class = hashToClassName(lastSimple);
			}
		}
	}

	let p = new VNode(nodeName, attributes || undefined, children);

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode) options.vnode(p);

	return p;
}



let lastSimple = false;
function normalizeChildren(acc, arr, start) {
	for (let i=start; i<arr.length; i++) {
		let child = arr[i];
		if (child && child.join) {
			normalizeChildren(acc, child, 0);
		}
		else {
			let simple = !(falsey(child) || isFunction(child) || child instanceof VNode);
			if (simple && !isString(child)) child = String(child);
			if (simple && lastSimple) {
				acc[acc.length-1] += child;
			}
			else if (!falsey(child)) {
				acc.push(child);
				lastSimple = simple;
			}
		}
	}
}
