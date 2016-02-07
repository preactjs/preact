import { SYNC_RENDER, DOM_RENDER, NO_RENDER, EMPTY, EMPTY_BASE } from '../constants';
import options from '../options';
import { extend, isFunction } from '../util';
import { hook, deepHook } from '../hooks';
import { enqueueRender } from '../render-queue';
import { getNodeProps } from '.';
import build from './build';
import { createComponent, collectComponent } from './component-recycler';
import { isFunctionalComponent, buildFunctionalComponent } from './functional-component';


/** Mark component as dirty and queue up a render.
 *	@param {Component} component
 *	@private
 */
export function triggerComponentRender(component) {
	if (!component._dirty) {
		component._dirty = true;
		enqueueRender(component);
	}
}



/** Set a component's `props` (generally derived from JSX attributes).
 *	@param {Object} props
 *	@param {Object} [opts]
 *	@param {boolean} [opts.renderSync=false]	If `true` and {@link options.syncComponentUpdates} is `true`, triggers synchronous rendering.
 *	@param {boolean} [opts.render=true]			If `false`, no render will be triggered.
 */
export function setComponentProps(component, props, opts, context) {
	let d = component._disableRendering;
	component._disableRendering = true;

	opts = opts || EMPTY;

	if (context) {
		if (!component.prevContext) component.prevContext = extend({}, component.context);
		component.context = context;
	}

	hook(component, 'componentWillReceiveProps', props, component.context);

	if (!component.prevProps) component.prevProps = extend({}, component.props);
	component.props = props;

	component._disableRendering = d;

	if (opts.render!==false) {
		if (opts.renderSync || options.syncComponentUpdates) {
			renderComponent(component);
		}
		else {
			triggerComponentRender(component);
		}
	}
}



/** Render a Component, triggering necessary lifecycle events and taking High-Order Components into account.
 *	@param {Component} component
 *	@param {Object} [opts]
 *	@param {boolean} [opts.build=false]		If `true`, component will build and store a DOM node if not already associated with one.
 *	@private
 */
export function renderComponent(component, opts) {
	if (component._disableRendering) return;

	let skip, rendered,
		props = component.props,
		state = component.state,
		context = component.context,
		previousProps = component.prevProps || props,
		previousState = component.prevState || state,
		previousContext = component.prevContext || context,
		isUpdate = component.base;

	if (isUpdate) {
		component.props = previousProps;
		component.state = previousState;
		component.context = previousContext;
		if (hook(component, 'shouldComponentUpdate', props, state, context)===false) {
			skip = true;
		}
		else {
			hook(component, 'componentWillUpdate', props, state, context);
		}
		component.props = props;
		component.state = state;
		component.context = context;
	}

	component.prevProps = component.prevState = component.prevContext = null;
	component._dirty = false;

	if (!skip) {
		rendered = hook(component, 'render', props, state, context);

		let childComponent = rendered && rendered.nodeName,
			childContext = component.getChildContext ? component.getChildContext() : context,
			base;

		if (isFunction(childComponent) && childComponent.prototype.render) {
			// set up high order component link

			let inst = component._component;
			if (inst && inst.constructor!==childComponent) {
				unmountComponent(inst.base, inst, false);
				inst = null;
			}

			let childProps = getNodeProps(rendered);

			if (inst) {
				setComponentProps(inst, childProps, SYNC_RENDER, childContext);
			}
			else {
				inst = createComponent(childComponent, childProps, childContext);
				inst._parentComponent = component;
				component._component = inst;
				if (component.base) deepHook(inst, 'componentWillMount');
				setComponentProps(inst, childProps, NO_RENDER, childContext);
				renderComponent(inst, DOM_RENDER);
				if (component.base) deepHook(inst, 'componentDidMount');
			}

			base = inst.base;
		}
		else {
			// destroy high order component link
			if (component._component) {
				unmountComponent(component.base, component._component);
			}
			component._component = null;

			if (component.base || (opts && opts.build)) {
				base = build(component.base, rendered || EMPTY_BASE, childContext);
			}
		}

		if (component.base && base!==component.base) {
			let p = component.base.parentNode;
			if (p) p.replaceChild(base, component.base);
		}

		component.base = base;
		if (base) {
			base._component = component;
			base._componentConstructor = component.constructor;
		}

		if (isUpdate) {
			hook(component, 'componentDidUpdate', previousProps, previousState, previousContext);
		}
	}

	let cb = component._renderCallbacks;
	if (cb) {
		for (let i=cb.length; i--; ) cb[i]();
		cb.length = 0;
	}

	return rendered;
}



/** Apply the Component referenced by a VNode to the DOM.
 *	@param {Element} dom	The DOM node to mutate
 *	@param {VNode} vnode	A Component-referencing VNode
 *	@returns {Element} dom	The created/mutated element
 *	@private
 */
export function buildComponentFromVNode(dom, vnode, context) {
	let c = dom && dom._component;

	if (isFunctionalComponent(vnode)) {
		let p = build(dom, buildFunctionalComponent(vnode, context), context);
		p._componentConstructor = vnode.nodeName;
		return p;
	}

	let isOwner = c && dom._componentConstructor===vnode.nodeName;
	while (c && !isOwner && (c=c._parentComponent)) {
		isOwner = c.constructor===vnode.nodeName;
	}

	if (isOwner) {
		setComponentProps(c, getNodeProps(vnode), SYNC_RENDER, context);
	}
	else {
		if (c) {
			unmountComponent(dom, c);
			dom = null;
		}
		dom = createComponentFromVNode(vnode, dom, context);
	}

	return dom;
}



/** Instantiate and render a Component, given a VNode whose nodeName is a constructor.
 *	@param {VNode} vnode
 *	@private
 */
function createComponentFromVNode(vnode, dom, context) {
	let props = getNodeProps(vnode);
	let component = createComponent(vnode.nodeName, props, context);
	if (dom) component.base = dom;
	setComponentProps(component, props, NO_RENDER, context);
	renderComponent(component, DOM_RENDER);

	// let node = component.base;
	//if (!node._component) {
	//	node._component = component;
	//	node._componentConstructor = vnode.nodeName;
	//}

	return component.base;
}



/** Remove a component from the DOM and recycle it.
 *	@param {Element} dom			A DOM node from which to unmount the given Component
 *	@param {Component} component	The Component instance to unmount
 *	@private
 */
function unmountComponent(dom, component, remove) {
	// console.warn('unmounting mismatched component', component);

	hook(component, 'componentWillUnmount');
	if (remove!==false) {
		if (dom._component===component) {
			delete dom._component;
			delete dom._componentConstructor;
		}
		let base = component.base;
		if (base && base.parentNode) {
			base.parentNode.removeChild(base);
		}
	}
	component._parentComponent = null;
	hook(component, 'componentDidUnmount');
	collectComponent(component);
}
