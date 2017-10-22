import { ELEMENT_NODE } from './constants';

export function createElement(tag, props) {
	let children = [];
	for (let i=2; i<arguments.length; i++) children.push(arguments[i]);
	return createVNode(ELEMENT_NODE, tag, props, children, null, props!=null ? props.key : null);
}

export function createVNode(type, tag, props, children, text, key) {
	return { type, tag, props, children, text, key, index: null, _children: null, _el: null, _component: null };
}
