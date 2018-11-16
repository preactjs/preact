import {Component} from '../component';
import options from '../options';

/**
 * Retains a pool of Components for re-use.
 * @type {Component[]}
 * @private
 */
const recyclerComponents = [];

/**
 * Stores a component's base (element) for later reuse. Default implementation reuses per component type. Overridable via options.recycle
 * @param {Component} component
 * @param {HTMLElement} base
 */
export function recycle(component, base) {
	component.nextBase = base;
	recyclerComponents.push(component);
}

/**
 * Finds a base (element) for a component type if available, and removes it from the pool of recycled component bases.. Otherwise null.
 * Overridable iva options.findRecycledBase
 * @param {function} component constructor
 * @returns {HTMLElement|void}
 */
export function reclaimRecycledBase(componentCtor) {
	let i = recyclerComponents.length;
	while (i--) {
		if (recyclerComponents[i].constructor===componentCtor) {
			const base = recyclerComponents[i].nextBase;
			recyclerComponents.splice(i, 1);
			return base;
		}
	}
}


/**
 * Create a component. Normalizes differences between PFC's and classful
 * Components.
 * @param {function} Ctor The constructor of the component to create
 * @param {object} props The initial props of the component
 * @param {object} context The initial context of the component
 * @returns {import('../component').Component}
 */
export function createComponent(Ctor, props, context) {
	let inst;

	if (Ctor.prototype && Ctor.prototype.render) {
		inst = new Ctor(props, context);
		Component.call(inst, props, context);
	}
	else {
		inst = new Component(props, context);
		inst.constructor = Ctor;
		inst.render = doRender;
	}


	inst.nextBase = (options.reclaimRecycledBase || reclaimRecycledBase)(Ctor, props, context);

	return inst;
}


/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
