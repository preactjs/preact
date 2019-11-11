import { Component, toChildArray } from 'preact';
import { Suspense } from './suspense';
import { suspenseWillResolve, suspenseDidResolve } from './suspense-list-utils';

// having custom inheritance instead of a class here saves a lot of bytes
export function SuspenseList(props) {
	this._suspenseBoundaries = [];
	this._readyToRender = false;
	this._isSuspenseResolved = false;
	this._suspenseCallbacks = new Map();
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
		if (suspenseBoundary === vnode) {
			const nextVNode = this._suspenseBoundaries[index + 1];
			const cb = nextVNode ? this._suspenseCallbacks.get(nextVNode) : null;
			if (nextVNode && cb && !nextVNode._component._isSuspenseResolved) {
				cb();
			}
			return true;
		}
	});
	const allSuspenseResolved = this._suspenseBoundaries.every(
		boundary => boundary._component._isSuspenseResolved
	);
	if (allSuspenseResolved) {
		this._isSuspenseResolved = true;
		suspenseDidResolve(this._vnode);
	}
};

SuspenseList.prototype.__suspenseWillResolve = function(vnode, cb) {
	this._suspenseCallbacks.set(vnode, cb);

	/**
	 * A Suspense list with revealorder=t is ready render only when all
	 * of its children are ready to render.
	 */
	if (this.__getRevealOrder() === 't') {
		if (
			this._suspenseBoundaries.every(
				suspenseBoundary =>
					this._suspenseCallbacks.has(suspenseBoundary) ||
					suspenseBoundary._component._isSuspenseResolved
			)
		) {
			return suspenseWillResolve(this._vnode, () => {
				this._readyToRender = true;
				this.__findAndResolveNextcandidate();
			});
		}
	} else {
		this.__findAndResolveNextcandidate();
	}
};

SuspenseList.prototype.__findAndResolveNextcandidate = function() {
	if (!this._readyToRender) {
		return;
	}

	const revealOrder = this.__getRevealOrder();
	if (revealOrder === '') {
		this._suspenseBoundaries.forEach(suspenseBoundary => {
			const cb = this._suspenseCallbacks.get(suspenseBoundary);
			if (!suspenseBoundary._component._isSuspenseResolved && cb) {
				cb();
			}
		});
	} else if (revealOrder === 't') {
		this._suspenseBoundaries.some(suspenseBoundary => {
			if (this._suspenseCallbacks.has(suspenseBoundary)) {
				this._suspenseCallbacks.get(suspenseBoundary)();
				return true;
			}
		});
	} else {
		/**
		 * Forwards and backwards work the same way.
		 * The direction is controlled in render method while creating `_suspenseBoundaries` itself.
		 */
		// find if the current vnode's suspense can be resolved
		this._suspenseBoundaries.some(suspenseBoundary => {
			const cb = this._suspenseCallbacks.get(suspenseBoundary);
			if (cb && !suspenseBoundary._component._isSuspenseResolved) {
				cb();
				return true;
			} else if (!cb && suspenseBoundary._component._isSuspenseResolved) {
				// for condition: https://github.com/preactjs/preact/pull/2063#issuecomment-5521226201
				return false;
			} else if (!cb) {
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
	this._suspenseBoundaries = children.filter(
		child =>
			child.type.name === Suspense.name || child.type.name === SuspenseList.name
	);
	if (this.__getRevealOrder() === 'b') {
		this._suspenseBoundaries.reverse();
	}
	return children;
};
