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
 * @typedef {Component} CustomComponent
 * @property {function} render
 */

/**
 * Create a component. Normalizes differences between PFC's and classful
 * Components.
 * @param {(props, context) => void} Ctor The constructor of the component to create
 * @param {object} props The initial props of the component
 * @param {object} context The initial context of the component
 * @returns {Component}
 */
export function createComponent(Ctor, props, context) {
	let list = components[Ctor.name],
		inst;

	if (Ctor.prototype && Ctor.prototype.render) {
		inst = new Ctor(props, context);
		Component.call(inst, props, context);
	}
	else {
		inst = new Component(props, context);
		inst.constructor = Ctor;
		/** @type {CustomComponent} */(inst).render =
			doRender;
	}


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
