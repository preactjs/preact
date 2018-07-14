import { ELEMENT_NODE } from './constants';

export function createElement(tag, props, children) {
	if (arguments.length>3) {
		children = [];
		for (let i=2; i<arguments.length; i++) {
			children.push(arguments[i]);
		}
	}
	return createVNode(ELEMENT_NODE, tag, props, children, null, props!=null ? props.key : null);
	// return createVNode(ELEMENT_NODE, tag, props==null ? EMPTY_OBJ : props, children, null, props!=null ? props.key : null);
}

// const RECYCLED_VNODES = [];

// export function reclaimVNode(vnode) {
// 	vnode.index = vnode._children = vnode._el = vnode._component = null;
// 	RECYCLED_VNODES.push(vnode);
// }

export function createVNode(type, tag, props, children, text, key) {

	// @TODO this is likely better off in createElement():
	if (type===ELEMENT_NODE) {
		if (props==null) props = {};
		if (children!=null) props.children = children;
		// children = props.children || (props.children = children);
		if (tag.defaultProps!=null) {
			for (let i in tag.defaultProps) {
				if (props[i]===undefined) props[i] = tag.defaultProps[i];
			}
		}
	}

	// let r = RECYCLED_VNODES.pop();
	// if (r!=null) {
	// 	r.type = type;
	// 	r.tag = tag;
	// 	r.props = props;
	// 	r.children = children;
	// 	r.text = text;
	// 	r.key = key;
	// 	return r;
	// }
	// return { type, tag, props, attributes: props, /*children,*/ text, key, index: null, _children: null, _el: null, _component: null };
	return { type, tag, props, /*children,*/ text, key, index: null, _children: null, _el: null, _component: null };
	// return { type, tag, props, children, text, key, index: null, _children: null, _el: null, _component: null };
}
