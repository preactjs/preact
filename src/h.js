import options from './options';
import VNode from './vnode';
import { hook } from './hooks';
import { empty } from './util';


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
		children, arr, lastSimple;

	if (len>2) {
		children = [];
		for (let i=2; i<len; i++) {
			let p = arguments[i];
			if (empty(p)) continue;
			if (p.join) {
				arr = p;
			}
			else {
				arr = SHARED_TEMP_ARRAY;
				arr[0] = p;
			}
			for (let j=0; j<arr.length; j++) {
				let child = arr[j],
					simple = !empty(child) && !(child instanceof VNode);
				if (simple) child = String(child);
				if (simple && lastSimple) {
					children[children.length-1] += child;
				}
				else if (!empty(child)) {
					children.push(child);
				}
				lastSimple = simple;
			}
		}
	}

	if (attributes && attributes.children) {
		delete attributes.children;
	}

	let p = new VNode(nodeName, attributes || undefined, children || undefined);
	hook(options, 'vnode', p);
	return p;
}
