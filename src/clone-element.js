import { assign } from './util';
import { EMPTY_ARR } from './constants';
// import { createElement, createVNode } from './create-element';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {VNode} vnode		The virutal DOM element to clone
 * @param {Object} props	Attributes/props to add when cloning
 * @param {VNode} rest		Any additional arguments will be used as replacement children.
 */
export function cloneElement(vnode, props) {
	// let children = [], i = 2;
	// for ( ; i<arguments.length; i++) children.push(arguments[i]);
	let out = assign({}, vnode);
	out.props = assign(assign({}, out.props), props);
	// if (i>2) out.children = children;
	// if (arguments.length>2) out.props.children = EMPTY_ARR.slice.call(arguments, 2);
	if (arguments.length>2) out.props.children = EMPTY_ARR.slice.call(arguments, 2);
	return out;
	// return createVNode(vnode.tag, assign(assign({}, vnode.props), props), i>2 ? children : null, vnode.text, vnode.key);


	// return createElement(
	// 	vnode.tag,
	// 	assign(assign({}, vnode.props), props),
	// 	arguments.length>2 ? [].slice.call(arguments, 2) : vnode.children
	// );
}

// export function cloneElement(vnode, props) {
// 	return createElement(
// 		vnode.tag,
// 		assign(assign({}, vnode.props), props),
// 		arguments.length>2 ? [].slice.call(arguments, 2) : vnode.children
// 	);
// }

// export function cloneElement(tag, props) {
// 	let vnode = tag;
// 	arguments[0] = vnode.tag;
// 	let el = createElement.apply(null, arguments);
// 	for (let i in vnode.props) if (el.props[i]===undefined) el.props[i] = vnode.props[i];
// 	if (arguments.length<3) el.children = vnode.children;
// 	return el;
// }
