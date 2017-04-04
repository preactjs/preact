import { VNode } from './vnode';
import options from './options';


const stack = [];

const EMPTY_CHILDREN = [];

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
	let children, lastSimple, child, simple, i;
	for (i=arguments.length; i-- > 2; ) {
		stack.push(arguments[i]);
	}
	if (attributes && attributes.children) {
		if (!stack.length) stack.push(attributes.children);
		delete attributes.children;
	}
	while (stack.length) {
		if ((child = stack.pop()) && child.pop!==undefined) {
			for (i=child.length; i--; ) stack.push(child[i]);
		}
		else {
			if ((simple = typeof nodeName!=='function')) {
				if (typeof child==='number') child = String(child);
				else if (child===true || child===false || child==null) child = '';
				else if (typeof child!=='string') simple = false;
			}

			if (simple && lastSimple) {
				children[children.length-1] += child;
			}
			else {
				(children===undefined ? (children = []) : children).push(child);
			}

			lastSimple = simple;
		}
	}

	let p = new VNode(nodeName, attributes || undefined, children || EMPTY_CHILDREN);

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode) options.vnode(p);

	return p;
}
