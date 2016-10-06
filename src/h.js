import { VNode } from './vnode';
import options from './options';


const stack = [];


/** JSX/hyperscript reviver
*	Benchmarks: https://esbench.com/bench/57ee8f8e330ab09900a1a1a0
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 *  @example
 *  /** @jsx h *\/
 *  import { render, h } from 'preact';
 *  render(<span>foo</span>, document.body);
 */
export function h(nodeName, attributes) {
	let children = [],
		lastSimple, child, simple, i;
	for (i=arguments.length; i-- > 2; ) {
		stack.push(arguments[i]);
	}
	if (attributes && attributes.children) {
		if (!stack.length) stack.push(attributes.children);
		delete attributes.children;
	}
	while (stack.length) {
		if ((child = stack.pop()) instanceof Array) {
			for (i=child.length; i--; ) stack.push(child[i]);
		}
		else if (child!=null && child!==false) {
			if (typeof child=='number' || child===true) child = String(child);
			simple = typeof child=='string';
			if (simple && lastSimple) {
				children[children.length-1] += child;
			}
			else {
				children.push(child);
				lastSimple = simple;
			}
		}
	}

	let p = new VNode(nodeName, attributes || undefined, children);

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode) options.vnode(p);

	return p;
}
