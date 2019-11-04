import { Component, options } from 'preact';
import { Suspense } from './suspense';

// Hook for Suspense boundaries to ask for any extra work before rendering suspended children.
options.__onSuspensionComplete = (vnode, cb) => {
	if (vnode._parent._component && vnode._parent._component.__modifySuspense) {
		vnode._parent._component.__modifySuspense(vnode, cb);
	} else {
		cb();
	}
};

// having custom inheritance instead of a class here saves a lot of bytes
export function SuspenseList(props) {
	// Todo(prateekbh): use a better name before sending the PR.
	this._thrillers = [];
}

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
SuspenseList.prototype = new Component();

SuspenseList.prototype.__modifySuspense = function(vnode, cb) {
	switch (this.props.revealOrder) {
		case 'forwards':
		case 'backwards':
			/**
			 * Forwards and backwards work the same way.
			 * The direction is controlled in render method while creating `_thrillers` itself.
			 */
			if (this._thrillers && this._thrillers[0].vnode === vnode) {
				cb();
				this._thrillers.shift();
				/**
				 * Find and execute all callbacks in order from 2nd position.
				 * Breaks as soon as a non resolved(cb===null) suspense found.
				 */
				this._thrillers.find(thrill => {
					if (thrill.cb === null) {
						return true; // breaks the find loop
					}
					thrill.cb();
				});
			} else {
				this._thrillers.find(thrill => thrill.vnode === vnode).cb = cb;
			}
			break;
		case 'together':
			this._thrillers.find(thrill => thrill.vnode === vnode).cb = cb;
			if (this._thrillers.every(thriller => thriller.cb)) {
				this._thrillers.forEach(thrill => thrill.cb());
			}
			break;
		default:
			cb();
	}
};

SuspenseList.prototype.render = function(props, state) {
	// assuming all suspense woul
	this._thrillers = props.children
		.filter(child => child.type.name === Suspense.name)
		.map(vnode => ({
			vnode,
			cb: null
		}));
	if (props.revealOrder === 'backwards') {
		this._thrillers.reverse();
	}
	return props.children;
};
