import { VNode } from './vnode';
import options from './options';


const stack = [];

const EMPTY_CHILDREN = [];

/** 
 * JSX/hyperscript reviver
 * Benchmarks: https://esbench.com/bench/57ee8f8e330ab09900a1a1a0
 *
 * This function represents a HTML node programmatically. This is
 * essential to build the virtual DOM tree so that it can later be
 * compared against the actual DOM tree and differences applied to
 * make change application easy.
 * 
 * It takes a node name, a list of all attributes that the node has,
 * and an optional list of children that the node has. Because 
 * children are typically nodes themselves, they are optional to 
 * pass.
 *
 * @example The following HTML construct
 *
 * `<div id="foo" name="bar">Hello!</div>`
 *
 * can be constructed using this function as:
 *
 * `h('div', { id: 'foo', name : 'bar' }, 'Hello!');`
 *
 * @param {string} nodeName the tag name of the HTML node, like 
 * `DIV`, `A`, `SPAN` etc.
 *
 * @param {Object} attributes an object representing all attributes 
 * that the HTML tag contains
 *
 * Note: Additional arguments to this method call are considered as
 * the children to be added to this DOM node.
 * 
 * @see http://jasonformat.com/wtf-is-jsx
 * 
 * @public
 */
export function h(nodeName, attributes) {
	let children=EMPTY_CHILDREN, lastSimple, child, simple, i;
	for (i=arguments.length; i-- > 2; ) {
		stack.push(arguments[i]);
	}
	if (attributes && attributes.children!=null) {
		if (!stack.length) stack.push(attributes.children);
		delete attributes.children;
	}
	while (stack.length) {
		if ((child = stack.pop()) && child.pop!==undefined) {
			for (i=child.length; i--; ) stack.push(child[i]);
		}
		else {
			if (typeof child==='boolean') child = null;

			if ((simple = typeof nodeName!=='function')) {
				if (child==null) child = '';
				else if (typeof child==='number') child = String(child);
				else if (typeof child!=='string') simple = false;
			}

			if (simple && lastSimple) {
				children[children.length-1] += child;
			}
			else if (children===EMPTY_CHILDREN) {
				children = [child];
			}
			else {
				children.push(child);
			}

			lastSimple = simple;
		}
	}

	let p = new VNode();
	p.nodeName = nodeName;
	p.children = children;
	p.attributes = attributes==null ? undefined : attributes;
	p.key = attributes==null ? undefined : attributes.key;

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode!==undefined) options.vnode(p);

	return p;
}
