import { createElement, cloneElement, Component as CevicheComponent, render } from 'ceviche';
const ATTRS_DESCRIPTOR = {
	configurable: true,
	enumerable: true,
	get() {
		return this.props;
	}
};
export function h(...args) {
	let vnode = createElement(...args);
	Object.defineProperty(vnode, 'attributes', ATTRS_DESCRIPTOR);
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
		Object.defineProperty(obj, 'attributes', ATTRS_DESCRIPTOR);
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
