import { Component } from '../component';

/**
 * Retains a pool of Components for re-use, keyed on component name.
 * Note: since component names are not unique or even necessarily available,
 * these are primarily a form of sharding.
 * @type {Object.<string, Component[]>}
 * @private
 */
const components = {};


/**
 * Reclaim a component for later re-use by the recycler.
 * @param {Component} component The component to collect
 */
export function collectComponent(component) {
	let name = component.constructor.name;
	(components[name] || (components[name] = [])).push(component);
}


/**
 * Create a component. Normalizes differences between PFC's and classful
 * Components.
 * @param {function} Ctor The constructor of the component to create
 * @param {object} props The initial props of the component
 * @param {object} context The initial context of the component
 * @param {import('../component').Component} [ancestorComponent] The nearest ancestor component beneath
 *  which the new component will be mounted
 * @returns {import('../component').Component}
 */
export function createComponent(Ctor, props, context, ancestorComponent) {
	let list = components[Ctor.name],
		inst;

	if (Ctor.prototype && Ctor.prototype.render) {
		inst = new Ctor(props, context);
		Component.call(inst, props, context);
	}
	else {
		inst = new Component(props, context);
		inst.constructor = Ctor;
		inst.render = doRender;
	}
	inst._ancestorComponent = ancestorComponent;

	if (list) {
		for (let i=list.length; i--; ) {
			if (list[i].constructor===Ctor) {
				inst.nextBase = list[i].nextBase;
				list.splice(i, 1);
				break;
			}
		}
	}
	return inst;
}


/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this.constructor(props, context);
}
