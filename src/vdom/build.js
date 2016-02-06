import { TEXT_CONTENT, EMPTY } from '../constants';
import { hasOwnProperty, empty, toArray, isString, isFunction } from '../util';
import { hook, deepHook } from '../hooks';
import { isSameNodeType } from '.';
import { buildFunctionalComponent } from './functional-component';
import { buildComponentFromVNode } from './component';
import { appendChildren, getAccessor, setAccessor, getNodeAttributes } from '../dom';
import { collectComponent } from './component-recycler';
import { createNode, collectNode } from '../dom/recycler';


/** Apply differences in a given vnode (and it's deep children) to a real DOM Node.
 *	@param {Element} [dom=null]		A DOM node to mutate into the shape of the `vnode`
 *	@param {VNode} vnode			A VNode (with descendants forming a tree) representing the desired DOM structure
 *	@returns {Element} dom			The created/mutated element
 *	@private
 */
export default function build(dom, vnode, context) {
	let out = dom,
		nodeName = vnode.nodeName;

	if (isFunction(nodeName) && !nodeName.prototype.render) {
		vnode = buildFunctionalComponent(vnode, context);
		nodeName = vnode.nodeName;
	}

	if (isFunction(nodeName)) {
		return buildComponentFromVNode(dom, vnode, context);
	}

	if (isString(vnode)) {
		if (dom) {
			if (dom.nodeType===3) {
				dom[TEXT_CONTENT] = vnode;
				return dom;
			}
			else if (dom.nodeType===1) {
				collectNode(dom);
			}
		}
		return document.createTextNode(vnode);
	}

	if (empty(nodeName)) {
		nodeName = 'x-undefined-element';
	}

	if (!dom) {
		out = createNode(nodeName);
	}
	else if (dom.nodeName.toLowerCase()!==nodeName) {
		out = createNode(nodeName);
		appendChildren(out, toArray(dom.childNodes));
		// reclaim element nodes
		if (dom.nodeType===1) collectNode(dom);
	}

	// apply attributes
	let old = getNodeAttributes(out) || EMPTY,
		attrs = vnode.attributes || EMPTY;

	// removed attributes
	if (old!==EMPTY) {
		for (let name in old) {
			if (hasOwnProperty.call(old, name)) {
				let o = attrs[name];
				if (empty(o)) {
					setAccessor(out, name, null, old[name]);
				}
			}
		}
	}

	// grab children prior to setting attributes to ignore children added via dangerouslySetInnerHTML
	let children = toArray(out.childNodes);

	// new & updated attributes
	if (attrs!==EMPTY) {
		for (let name in attrs) {
			if (hasOwnProperty.call(attrs, name)) {
				let value = attrs[name];
				if (!empty(value)) {
					let prev = getAccessor(out, name, old[name]);
					if (value!=prev) {
						setAccessor(out, name, value, prev);
					}
				}
			}
		}
	}


	let keyed = {};
	for (let i=children.length; i--; ) {
		let t = children[i].nodeType;
		let key;
		if (t===3) {
			key = t.key;
		}
		else if (t===1) {
			key = children[i].getAttribute('key');
		}
		else {
			continue;
		}
		if (key) keyed[key] = children.splice(i, 1)[0];
	}
	let newChildren = [];

	if (vnode.children) {
		for (let i=0, vlen=vnode.children.length; i<vlen; i++) {
			let vchild = vnode.children[i];
			// if (isFunctionalComponent(vchild)) {
			// 	vchild = buildFunctionalComponent(vchild);
			// }
			let attrs = vchild.attributes,
				key, child;
			if (attrs) {
				key = attrs.key;
				child = key && keyed[key];
			}

			// attempt to pluck a node of the same type from the existing children
			if (!child) {
				let len = children.length;
				if (children.length) {
					for (let j=0; j<len; j++) {
						if (isSameNodeType(children[j], vchild)) {
							child = children.splice(j, 1)[0];
							break;
						}
					}
				}
			}

			// morph the matched/found/created DOM child to match vchild (deep)
			newChildren.push(build(child, vchild, context));
		}
	}

	// apply the constructed/enhanced ordered list to the parent
	for (let i=0, len=newChildren.length; i<len; i++) {
		// we're intentionally re-referencing out.childNodes here as it is a live NodeList
		if (out.childNodes[i]!==newChildren[i]) {
			let child = newChildren[i],
				c = child._component,
				next = out.childNodes[i+1];
			if (c) deepHook(c, 'componentWillMount');
			if (next) {
				out.insertBefore(child, next);
			}
			else {
				out.appendChild(child);
			}
			if (c) deepHook(c, 'componentDidMount');
		}
	}

	// remove orphaned children
	for (let i=0, len=children.length; i<len; i++) {
		let child = children[i],
			c = child._component,
			p = child.parentNode;
		if (c) hook(c, 'componentWillUnmount');
		if (p) p.removeChild(child);
		if (c) {
			hook(c, 'componentDidUnmount');
			collectComponent(c);
		}
		else if (child.nodeType===1) {
			collectNode(child);
		}
	}

	return out;
}
