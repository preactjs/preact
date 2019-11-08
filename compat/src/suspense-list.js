import { Component, toChildArray } from 'preact';
import { Suspense } from './suspense';
import { suspenseWillResolve, suspenseDidResolve } from './suspense-list-utils';

// having custom inheritance instead of a class here saves a lot of bytes
export function SuspenseList(props) {
	this._suspenseBoundaries = [];
	this._readyToRender = false;
	this._isSuspenseResolved = false;
}

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
SuspenseList.prototype = new Component();

SuspenseList.prototype.__getRevealOrder = function() {
	let order = this.props.revealOrder;
	const parent = this._vnode._parent;

	/**
	 * A nested SuspenseList whose parent SuspenseList has revealOrder=t
	 * should behave as revealOrder=t. This makes everything appear together.
	 */
	if (
		parent.type.name === SuspenseList.name &&
		parent._component.__getRevealOrder() === 't'
	) {
		order = 't';
	}

	if (!order) {
		return '';
	}

	return order[0];
};

SuspenseList.prototype.__suspenseDidResolve = function(vnode) {
	this._suspenseBoundaries.some((suspenseBoundary, index) => {
		if (suspenseBoundary.__vnode === vnode) {
			if (
				this._suspenseBoundaries[index + 1] &&
				this._suspenseBoundaries[index + 1].__suspenseResolvedCallback &&
				!this._suspenseBoundaries[index + 1].__vnode._component
					._isSuspenseResolved
			) {
				this._suspenseBoundaries[index + 1].__suspenseResolvedCallback();
			} else if (index === this._suspenseBoundaries.length - 1) {
				this._isSuspenseResolved = true;
				suspenseDidResolve(this._vnode);
			}
			return true;
		}
	});
};

SuspenseList.prototype.__suspenseWillResolve = function(vnode, cb) {
	// set the callback to the correct position
	this._suspenseBoundaries.some(suspenseBoundary => {
		if (suspenseBoundary.__vnode === vnode) {
			suspenseBoundary.__suspenseResolvedCallback = cb;
			return true; // breaks the find loop
		}
	});

	/**
	 * A Suspense list with revealorder=t is ready render only when all
	 * of its children are ready to render.
	 */
	if (this.__getRevealOrder() === 't') {
		if (
			this._suspenseBoundaries.every(
				suspenseBoundary => suspenseBoundary.__suspenseResolvedCallback
			)
		) {
			suspenseWillResolve(this._vnode, () => {
				this._readyToRender = true;
				this.__findAndResolveNextcandidate();
			});
		}
	}

	this.__findAndResolveNextcandidate();
};

SuspenseList.prototype.__findAndResolveNextcandidate = function() {
	if (!this._readyToRender) {
		return;
	}

	const revealOrder = this.__getRevealOrder();
	if (revealOrder === '') {
		this._suspenseBoundaries.forEach(suspenseBoundary => {
			if (
				!suspenseBoundary.__vnode._component._isSuspenseResolved &&
				suspenseBoundary.__suspenseResolvedCallback
			) {
				suspenseBoundary.__suspenseResolvedCallback();
			}
		});
	} else if (revealOrder === 't') {
		if (
			this._suspenseBoundaries.every(
				suspenseBoundary => suspenseBoundary.__suspenseResolvedCallback
			)
		) {
			this._suspenseBoundaries[0].__suspenseResolvedCallback();
		}
	} else {
		/**
		 * Forwards and backwards work the same way.
		 * The direction is controlled in render method while creating `_suspenseBoundaries` itself.
		 */
		// find if the current vnode's suspense can be resolved
		this._suspenseBoundaries.some(suspenseBoundary => {
			if (
				!suspenseBoundary.__vnode._component._isSuspenseResolved &&
				suspenseBoundary.__suspenseResolvedCallback
			) {
				suspenseBoundary.__suspenseResolvedCallback();
				return true;
			} else if (!suspenseBoundary.__suspenseResolvedCallback) {
				return true;
			}
		});
	}
};

SuspenseList.prototype.componentDidMount = function() {
	/**
	 * A Suspense list with revealorder!=t is always ready render.
	 */
	const order = this.__getRevealOrder();
	if (order !== 't') {
		suspenseWillResolve(this._vnode, () => {
			this._readyToRender = true;
			this.__findAndResolveNextcandidate();
		});
	}
};

SuspenseList.prototype.render = function(props) {
	const children = toChildArray(props.children);
	this._suspenseBoundaries = children
		.filter(
			child =>
				child.type.name === Suspense.name ||
				child.type.name === SuspenseList.name
		)
		.map(__vnode => ({
			__vnode,
			__suspenseResolvedCallback: null
		}));
	if (this.__getRevealOrder() === 'b') {
		this._suspenseBoundaries.reverse();
	}
	return children;
};
