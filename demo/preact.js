import {
	options,
	createElement,
	cloneElement,
	Component as CevicheComponent,
	render
} from 'preact';

options.vnode = vnode => {
	vnode.nodeName = vnode.type;
	vnode.attributes = vnode.props;
	vnode.children = vnode._children || [].concat(vnode.props.children || []);
};

function asArray(arr) {
	return Array.isArray(arr) ? arr : [arr];
}

function normalize(obj) {
	if (Array.isArray(obj)) {
		return obj.map(normalize);
	}
	if ('type' in obj && !('attributes' in obj)) {
		obj.attributes = obj.props;
	}
	return obj;
}

export function Component(props, context) {
	CevicheComponent.call(this, props, context);
	const render = this.render;
	this.render = function(props, state, context) {
		if (props.children) props.children = asArray(normalize(props.children));
		return render.call(this, props, state, context);
	};
}
Component.prototype = new CevicheComponent();

export { createElement, createElement as h, cloneElement, render };
