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
	let outChildren, arr, lastSimple;

	if (arguments.length > 2) {
		let inChildren = [];

		// Flatten one layer of children.
		for (let i=2, ilen=arguments.length; i < ilen; i++) {
			if (Array.isArray(arguments[i])) {
				for (let j=0, jlen=arguments[i].length; j < jlen; j++) {
					inChildren.push(arguments[i][j]);
				}
			} else {
				inChildren.push(arguments[i]);
			}
		}

		let firstChild = inChildren[0];
		let type = typeof firstChild;

		if (inChildren.length === 1 && type!=='object' && type!=='function') {
			if (!falsey(firstChild)) {
				outChildren = [String(firstChild)];
			}
		}
		else {
			outChildren = [];
			for (let i=0, ilen=inChildren.length; i<ilen; i++) {
				let p = inChildren[i];
	
				if (falsey(p)) continue;
				if (p.join) arr = p;
				else (arr = SHARED_TEMP_ARRAY)[0] = p;
				for (let j=0; j<arr.length; j++) {
					let child = arr[j],
						simple = !(falsey(child) || isFunction(child) || child instanceof VNode);
					if (simple && !isString(child)) child = String(child);
					if (simple && lastSimple) {
						outChildren[outChildren.length-1] += child;
					}
					else if (!falsey(child)) {
						outChildren.push(child);
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
		}
	}

	let p = new VNode(nodeName, attributes || undefined, outChildren);

	// if a "vnode hook" is defined, pass every created VNode to it
	if (options.vnode) options.vnode(p);

	return p;
}
