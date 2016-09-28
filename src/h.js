import { VNode } from './vnode';
import options from './options';
import { falsey, isFunction, isString, hashToClassName } from './util';


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
		children, arr, lastSimple, lastSimple2;


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
				if (p.join) arr = p;
				else (arr = SHARED_TEMP_ARRAY)[0] = p;
				for (let j=0; j<arr.length; j++) {
					let child = arr[j],
						simple = !(falsey(child) || isFunction(child) || child instanceof VNode || Array.isArray(child));
					if (simple && !isString(child)) child = String(child);
					if (simple && lastSimple) {
						children[children.length-1] += child;
					}
					else if (Array.isArray(child)) {
						let arr2 = child;
						for (let k = 0; k < arr2.length; k++) {
							let child2 = arr2[k],
								simple2 = !(falsey(child2) || isFunction(child2) || child2 instanceof VNode);
							if (simple2 && !isString(child2)) child2 = String(child2);
							if (simple2 && lastSimple2)
								children[children.length - 1] += child2;
							else if (!falsey(child2)) {
								children.push(child2);
								lastSimple2 = simple;
							}
						}
					}
					else if (!falsey(child)) {
						children.push(child);
						lastSimple = simple;
					}
				}
			}
		}
	}
	else if (attributes && attributes.children) {
		return h(nodeName, attributes, attributes.children);
	}

	if (attributes) {
		if (attributes.children) {
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

			// lastSimple = attributes.style;
			// if (lastSimple && !isString(lastSimple)) {
			// 	attributes.style = styleObjToCss(lastSimple);
			// }
		}
	}

	let p = new VNode(nodeName, attributes || undefined, children);
	if (options.vnode) options.vnode(p);
	return p;
}
