import { Component, options } from 'preact';
import { Suspense } from './suspense';

// Hook for Suspense boundaries to ask for any extra work before rendering suspended children.
options.__suspenseDidResolve = (vnode, cb) => {
	if (vnode._parent._component && vnode._parent._component.__modifySuspense) {
		vnode._parent._component.__modifySuspense(vnode, cb);
	} else {
		cb();
	}
};

options.__canSuspenseResolve = (vnode, cb) => {
	if (vnode._parent._component && vnode._parent._component.__modifySuspense) {
		vnode._parent._component.__modifySuspense(vnode, cb);
	} else {
		cb();
	}
};

// having custom inheritance instead of a class here saves a lot of bytes
export function SuspenseList(props) {
	this._suspenseBoundaries = [];
}

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
SuspenseList.prototype = new Component();

// SuspenseList.prototype.__canSuspenseResolve = function(vnode, cb) {

// }

SuspenseList.prototype.__modifySuspense = function(vnode, cb) {
	const revealOrder = this.props.revealOrder;
	if (!revealOrder) {
		return cb();
	}

	if (revealOrder[0] === 'f' || revealOrder[0] === 'b') {
		/**
		 * Forwards and backwards work the same way.
		 * The direction is controlled in render method while creating `_suspenseBoundaries` itself.
		 */
		if (
			this._suspenseBoundaries &&
			this._suspenseBoundaries[0].vnode === vnode
		) {
			cb();
			this._suspenseBoundaries.shift();
			/**
			 * Find and execute all callbacks in order from 2nd position.
			 * Breaks as soon as a non resolved(cb===null) suspense found.
			 */
			this._suspenseBoundaries.some(suspenseBoundary => {
				if (suspenseBoundary.suspenseResolvedCallback === null) {
					return true; // breaks the find loop
				}
				suspenseBoundary.suspenseResolvedCallback();
			});
		} else {
			this._suspenseBoundaries.some(suspenseBoundary => {
				if (suspenseBoundary.vnode === vnode) {
					suspenseBoundary.suspenseResolvedCallback = cb;
					return true;
				}
			});
		}
	} else if (revealOrder[0] === 't') {
		this._suspenseBoundaries.some(suspenseBoundary => {
			if (suspenseBoundary.vnode === vnode) {
				suspenseBoundary.suspenseResolvedCallback = cb;
				return true;
			}
		});
		if (
			this._suspenseBoundaries.every(
				suspenseBoundary => suspenseBoundary.suspenseResolvedCallback
			)
		) {
			this._suspenseBoundaries.forEach(suspenseBoundary => {
				suspenseBoundary.suspenseResolvedCallback();
			});
		}
	}
};

SuspenseList.prototype.render = function(props) {
	this._suspenseBoundaries = (Array.isArray(props.children)
		? props.children
		: [props.children]
	)
		.filter(child => child.type.name === Suspense.name)
		.map(vnode => ({
			vnode,
			suspenseResolvedCallback: null
		}));
	if (props.revealOrder && props.revealOrder[0] === 'b') {
		this._suspenseBoundaries.reverse();
	}
	return props.children;
};
