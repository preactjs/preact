import { createElement, cloneElement, Component as CevicheComponent, render } from 'ceviche';

export function h(...args) {
	let vnode = createElement(...args);
	vnode.attributes = vnode.props;
	return vnode;
}

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

export function Component (props, context) {
	CevicheComponent.call(this, props, context);
	const render = this.render;
	this.render = function(props, state, context) {
		if (props.children) props.children = asArray(normalize(props.children));
		return render.call(this, props, state, context);
	};
}
Component.prototype = new CevicheComponent();

export { createElement, cloneElement, render };
