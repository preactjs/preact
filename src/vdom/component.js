import { SYNC_RENDER, NO_RENDER, FORCE_RENDER, ASYNC_RENDER, ATTR_KEY } from '../constants';
import options from '../options';
import { isFunction, clone, extend, empty } from '../util';
import { enqueueRender } from '../render-queue';
import { getNodeProps } from './index';
import { diff, mounts, diffLevel, flushMounts, removeOrphanedChildren, recollectNodeTree } from './diff';
import { isFunctionalComponent, buildFunctionalComponent } from './functional-component';
import { createComponent, collectComponent } from './component-recycler';
import { removeNode } from '../dom/index';


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
export function setComponentProps(component, props, opts, context, mountAll) {
	let b = component.base;
	if (component._disableRendering) return;
	component._disableRendering = true;

	if ((component.__ref = props.ref)) delete props.ref;
	if ((component.__key = props.key)) delete props.key;

	if (empty(b) || mountAll) {
		if (component.componentWillMount) component.componentWillMount();
	}
	else if (component.componentWillReceiveProps) {
		component.componentWillReceiveProps(props, context);
	}

	if (context && context!==component.context) {
		if (!component.prevContext) component.prevContext = component.context;
		component.context = context;
	}

	if (!component.prevProps) component.prevProps = component.props;
	component.props = props;

	component._disableRendering = false;

	if (opts!==NO_RENDER) {
		if (opts===SYNC_RENDER || options.syncComponentUpdates!==false || !b) {
			renderComponent(component, SYNC_RENDER, mountAll);
		}
		else {
			triggerComponentRender(component);
		}
	}

	if (component.__ref) component.__ref(component);
}



/** Render a Component, triggering necessary lifecycle events and taking High-Order Components into account.
 *	@param {Component} component
 *	@param {Object} [opts]
 *	@param {boolean} [opts.build=false]		If `true`, component will build and store a DOM node if not already associated with one.
 *	@private
 */
export function renderComponent(component, opts, mountAll) {
	if (component._disableRendering) return;

	let skip, rendered,
		props = component.props,
		state = component.state,
		context = component.context,
		previousProps = component.prevProps || props,
		previousState = component.prevState || state,
		previousContext = component.prevContext || context,
		isUpdate = component.base,
		initialBase = isUpdate || component.nextBase,
		baseParent = initialBase && initialBase.parentNode,
		initialComponent = initialBase && initialBase._component,
		initialChildComponent = component._component;

	// if updating
	if (isUpdate) {
		component.props = previousProps;
		component.state = previousState;
		component.context = previousContext;
		if (opts!==FORCE_RENDER
			&& component.shouldComponentUpdate
			&& component.shouldComponentUpdate(props, state, context) === false) {
			skip = true;
		}
		else if (component.componentWillUpdate) {
			component.componentWillUpdate(props, state, context);
		}
		component.props = props;
		component.state = state;
		component.context = context;
	}

	component.prevProps = component.prevState = component.prevContext = component.nextBase = null;
	component._dirty = false;

	if (!skip) {
		if (component.render) rendered = component.render(props, state, context);

		// context to pass to the child, can be updated via (grand-)parent component
		if (component.getChildContext) {
			context = extend(clone(context), component.getChildContext());
		}

		while (isFunctionalComponent(rendered)) {
			rendered = buildFunctionalComponent(rendered, context);
		}

		let childComponent = rendered && rendered.nodeName,
			toUnmount, base;

		if (isFunction(childComponent) && childComponent.prototype.render) {
			// set up high order component link

			let inst = initialChildComponent,
				childProps = getNodeProps(rendered);

			if (inst && inst.constructor===childComponent) {
				setComponentProps(inst, childProps, SYNC_RENDER, context);
			}
			else {
				toUnmount = inst;
				inst = createComponent(childComponent, childProps, context);
				inst._parentComponent = component;
				component._component = inst;
				setComponentProps(inst, childProps, NO_RENDER, context);
				renderComponent(inst, SYNC_RENDER);
			}

			base = inst.base;
		}
		else {
			let cbase = initialBase;

			// destroy high order component link
			toUnmount = initialChildComponent;
			if (toUnmount) {
				cbase = component._component = null;
			}

			if (initialBase || opts===SYNC_RENDER) {
				if (cbase) cbase._component = null;
				base = diff(cbase, rendered, context, mountAll || !isUpdate, baseParent, true, initialBase && initialBase.nextSibling);
			}
		}

		if (initialBase && base!==initialBase) {
			if (!toUnmount && initialComponent===component && !initialChildComponent && initialBase.parentNode) {
				initialBase._component = null;
				recollectNodeTree(initialBase);
			}
		}

		if (toUnmount) {
			unmountComponent(toUnmount, true);
		}

		component.base = base;
		if (base) {
			let componentRef = component,
				t = component;
			while ((t=t._parentComponent)) { componentRef = t; }
			base._component = componentRef;
			base._componentConstructor = componentRef.constructor;
		}

	}

	if (!isUpdate || mountAll) {
		mounts.unshift(component);
		if (!diffLevel) flushMounts();
	}
	else if (!skip && component.componentDidUpdate) {
		component.componentDidUpdate(previousProps, previousState, previousContext);
	}

	let cb = component._renderCallbacks, fn;
	if (cb) while ( (fn = cb.pop()) ) fn.call(component);

	return rendered;
}



/** Apply the Component referenced by a VNode to the DOM.
 *	@param {Element} dom	The DOM node to mutate
 *	@param {VNode} vnode	A Component-referencing VNode
 *	@returns {Element} dom	The created/mutated element
 *	@private
 */
export function buildComponentFromVNode(dom, vnode, context, mountAll) {
	let c = dom && dom._component,
		oldDom = dom,
		isDirectOwner = c && dom._componentConstructor===vnode.nodeName,
		isOwner = isDirectOwner,
		props = getNodeProps(vnode);
	while (c && !isOwner && (c=c._parentComponent)) {
		isOwner = c.constructor===vnode.nodeName;
	}

	if (isOwner && (!mountAll || c._component)) {
		setComponentProps(c, props, ASYNC_RENDER, context, mountAll);
		dom = c.base;
	}
	else {
		if (c && !isDirectOwner) {
			unmountComponent(c, true);
			dom = oldDom = null;
		}

		c = createComponent(vnode.nodeName, props, context);
		if (dom && !c.nextBase) c.nextBase = dom;
		setComponentProps(c, props, SYNC_RENDER, context, mountAll);
		dom = c.base;

		if (oldDom && dom!==oldDom) {
			oldDom._component = null;
			recollectNodeTree(oldDom);
		}
	}

	return dom;
}



/** Remove a component from the DOM and recycle it.
 *	@param {Element} dom			A DOM node from which to unmount the given Component
 *	@param {Component} component	The Component instance to unmount
 *	@private
 */
export function unmountComponent(component, remove) {
	// console.log(`${remove?'Removing':'Unmounting'} component: ${component.constructor.name}`);
	let base = component.base;

	component._disableRendering = true;

	if (component.componentWillUnmount) component.componentWillUnmount();

	component.base = null;

	// recursively tear down & recollect high-order component children:
	let inner = component._component;
	if (inner) {
		unmountComponent(inner, remove);
	}
	else if (base) {
		if (base[ATTR_KEY] && base[ATTR_KEY].ref) base[ATTR_KEY].ref(null);

		component.nextBase = base;

		if (remove) {
			removeNode(base);
			collectComponent(component);
		}
		removeOrphanedChildren(base.childNodes, !remove);
	}

	if (component.__ref) component.__ref(null);
	if (component.componentDidUnmount) component.componentDidUnmount();
}
