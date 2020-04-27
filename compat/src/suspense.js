import { Component, createElement, Fragment, options } from 'preact';
import { assign } from './util';

const oldCatchError = options._catchError;
options._catchError = function(error, newVNode, oldVNode) {
	if (error.then) {
		/** @type {import('./internal').Component} */
		let component;
		let vnode = newVNode;

		for (; (vnode = vnode._parent); ) {
			if ((component = vnode._component) && component._childDidSuspend) {
				// Don't call oldCatchError if we found a Suspense
				return component._childDidSuspend(error, newVNode._component, newVNode);
			}
		}
	}
	oldCatchError(error, newVNode, oldVNode);
};

function detachedClone(vnode) {
	if (vnode) {
		vnode = assign({}, vnode);
		vnode._component = null;
		vnode._children = vnode._children && vnode._children.map(detachedClone);
	}
	return vnode;
}

// having custom inheritance instead of a class here saves a lot of bytes
export function Suspense(props) {
	// we do not call super here to golf some bytes...
	this._suspensions = 0;
	this._detachOnNextRender = null;
}

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
Suspense.prototype = new Component();

/**
 * @param {Promise} promise The thrown promise
 * @param {Component<any, any>} suspendingComponent The suspending component
 * @param {import('./internal').VNode | null | undefined} vnode the VNode that originated this suspend
 */
Suspense.prototype._childDidSuspend = function(
	promise,
	suspendingComponent,
	vnode
) {
	/** @type {import('./internal').SuspenseComponent} */
	const c = this;

	const resolve = suspended(c._vnode);

	let resolved = false;
	const onResolved = () => {
		if (resolved) return;

		resolved = true;

		if (resolve) {
			resolve(onSuspensionComplete);
		} else {
			onSuspensionComplete();
		}
	};

	suspendingComponent._suspendedComponentWillUnmount =
		suspendingComponent.componentWillUnmount;
	suspendingComponent.componentWillUnmount = () => {
		onResolved();

		if (suspendingComponent._suspendedComponentWillUnmount) {
			suspendingComponent._suspendedComponentWillUnmount();
		}
	};

	const onSuspensionComplete = () => {
		if (!--c._suspensions) {
			c._vnode._children[0] = c.state._suspended;
			c.setState({ _suspended: (c._detachOnNextRender = null) });
		}
	};

	/**
	 * We do not set `suspended: true` during hydration because we want the actual markup to remain on screen
	 * and hydrate it when the suspense actually gets resolved.
	 * While in non-hydration cases the usual fallbac -> component flow would occour.
	 */
	const wasHydrating = vnode && vnode._hydrating === true;
	if (!wasHydrating && !c._suspensions++) {
		c.setState({ _suspended: (c._detachOnNextRender = c._vnode._children[0]) });
	}
	promise.then(onResolved, onResolved);
};

Suspense.prototype.render = function(props, state) {
	if (this._detachOnNextRender) {
		this._vnode._children[0] = detachedClone(this._detachOnNextRender);
		this._detachOnNextRender = null;
	}

	const fallback =
		state._suspended && createElement(Fragment, null, props.fallback);
	if (fallback) fallback._hydrating = null;

	return [
		createElement(Fragment, null, state._suspended ? null : props.children),
		fallback
	];
};

/**
 * Checks and calls the parent component's _suspended method, passing in the
 * suspended vnode. This is a way for a parent (e.g. SuspenseList) to get notified
 * that one of its children/descendants suspended.
 *
 * The parent MAY return a callback. The callback will get called when the
 * suspension resolves, notifying the parent of the fact.
 * Moreover, the callback gets function `unsuspend` as a parameter. The resolved
 * child descendant will not actually get unsuspended until `unsuspend` gets called.
 * This is a way for the parent to delay unsuspending.
 *
 * If the parent does not return a callback then the resolved vnode
 * gets unsuspended immediately when it resolves.
 *
 * @param {import('../src/internal').VNode} vnode
 * @returns {((unsuspend: () => void) => void)?}
 */
export function suspended(vnode) {
	let component = vnode._parent._component;
	return component && component._suspended && component._suspended(vnode);
}

export function lazy(loader) {
	let prom;
	let component;
	let error;

	function Lazy(props) {
		if (!prom) {
			prom = loader();
			prom.then(
				exports => {
					component = exports.default || exports;
				},
				e => {
					error = e;
				}
			);
		}

		if (error) {
			throw error;
		}

		if (!component) {
			throw prom;
		}

		return createElement(component, props);
	}

	Lazy.displayName = 'Lazy';
	Lazy._forwarded = true;
	return Lazy;
}
