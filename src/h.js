import { VNode } from './vnode';
import { optionsHook } from './hooks';
import { falsey, isString } from './util';


const SHARED_TEMP_ARRAY = [];


/** JSX/hyperscript reviver
 *	@see http://jasonformat.com/wtf-is-jsx
 *	@public
 *  @example
 *  /** @jsx h *\/
 *  import { render, h } from 'preact';
 *  render(<span>foo</span>, document.body);
 */
export function h(nodeName, attributes, firstChild) {
	let len = arguments.length,
		children, arr, lastSimple;


	if (len>2) {
		let type = typeof firstChild;
		if (len===3 && type!=='object' && type!=='function') {
			if (!falsey(firstChild)) {
				children = [String(firstChild)];
			}
		}
		else {
			children = [];
			for (let i=2; i<len; i++) {
				let p = arguments[i];
				if (falsey(p)) continue;
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
					if (simple && !isString(child)) child = String(child);
					if (simple && lastSimple) {
						children[children.length-1] += child;
					}
					else if (!falsey(child)) {
						children.push(child);
					}
					lastSimple = simple;
				}
			}
		}
	}
	else if (attributes && attributes.children) {
		return h(nodeName, attributes, attributes.children);
	}

	let p = new VNode(nodeName, attributes || undefined, children);
	optionsHook('vnode', p);
	return p;
}
