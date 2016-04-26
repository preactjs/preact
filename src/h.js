import VNode from './vnode';
import { optionsHook } from './hooks';
import { falsey } from './util';


const SHARED_TEMP_ARRAY = [];


/** JSX/hyperscript reviver
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 *  @example
 *  /** @jsx h *\/
 *  import { render, h } from 'preact';
 *  render(<span>foo</span>, document.body);
 */
export default function h(nodeName, attributes) {
	let len = arguments.length,
		attributeChildren = attributes && attributes.children,
		children, arr, lastSimple;

	if (attributeChildren) {
		delete attributes.children;

		// if (len<3) {
		// 	unfilteredChildren = attributeChildren;
		// 	start = 0;
		// }
		if (len<3) return h(nodeName, attributes, attributeChildren);
	}

	for (let i=2; i<len; i++) {
		let p = arguments[i];
		if (falsey(p)) continue;
		if (!children) children = [];
		if (p.join) {
			arr = p;
		}
		else {
			arr = SHARED_TEMP_ARRAY;
			arr[0] = p;
		}
		for (let j=0; j<arr.length; j++) {
			let child = arr[j],
				simple = !falsey(child) && !(child instanceof VNode);
			if (simple) child = String(child);
			if (simple && lastSimple) {
				children[children.length-1] += child;
			}
			else if (!falsey(child)) {
				children.push(child);
			}
			lastSimple = simple;
		}
	}

	let p = new VNode(nodeName, attributes || undefined, children || undefined);
	optionsHook('vnode', p);
	return p;
}
