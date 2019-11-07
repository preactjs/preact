import { Component, options } from 'preact';
import { Suspense } from './suspense';

// Hook for Suspense boundaries to ask for any extra work before rendering suspended children.
options.__suspenseWillResolve = (vnode, cb) => {
	if (
		vnode._parent._component &&
		vnode._parent._component.__suspenseWillResolve
	) {
		vnode._parent._component.__suspenseWillResolve(vnode, cb);
	} else {
		cb();
	}
};

options.__suspenseDidResolve = vnode => {
	if (
		vnode._parent._component &&
		vnode._parent._component.__suspenseDidResolve
	) {
		vnode._parent._component.__suspenseDidResolve(vnode);
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

SuspenseList.prototype.__suspenseDidResolve = function(vnode) {
	const revealOrder = this.props.revealOrder;
	if (!revealOrder) {
		return;
	}
	this._suspenseBoundaries.some((suspenseBoundary, index) => {
		if (suspenseBoundary.vnode === vnode) {
			if (
				this._suspenseBoundaries[index + 1] &&
				this._suspenseBoundaries[index + 1].suspenseResolvedCallback
			) {
				this._suspenseBoundaries[index + 1].suspenseResolvedCallback();
			}
			return true;
		}
	});
};

SuspenseList.prototype.__suspenseWillResolve = function(vnode, cb) {
	const revealOrder = this.props.revealOrder;
	if (!revealOrder) {
		return cb();
	}

	// set the callback to the correct position
	this._suspenseBoundaries.some(suspenseBoundary => {
		if (suspenseBoundary.vnode === vnode) {
			suspenseBoundary.suspenseResolvedCallback = cb;
			return true; // breaks the find loop
		}
	});

	if (revealOrder[0] === 'f' || revealOrder[0] === 'b') {
		/**
		 * Forwards and backwards work the same way.
		 * The direction is controlled in render method while creating `_suspenseBoundaries` itself.
		 */
		// find if the current vnode's suspense can be resolved
		this._suspenseBoundaries.some(suspenseBoundary => {
			if (!suspenseBoundary.vnode._component._isSuspenseResolved) {
				if (suspenseBoundary.vnode === vnode) {
					cb();
				}
				return true;
			}
		});
	} else if (revealOrder[0] === 't') {
		if (
			this._suspenseBoundaries.every(
				suspenseBoundary => suspenseBoundary.suspenseResolvedCallback
			)
		) {
			this._suspenseBoundaries[0].suspenseResolvedCallback();
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
