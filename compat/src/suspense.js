import { Component, Fragment, createElement, options } from 'preact';
import {
	COMPONENT_FORCE,
	FORCE_PROPS_REVALIDATE,
	MODE_HYDRATE
} from '../../src/constants';
import { cloneVNode } from '../../src/util';

const oldCatchError = options._catchError;
options._catchError = (error, newVNode, oldVNode, errorInfo) => {
	if (error.then) {
		/** @type {import('./internal').Component} */
		let component;
		let vnode = newVNode;

		while ((vnode = vnode._parent)) {
			if ((component = vnode._component) && component._childDidSuspend) {
				if (newVNode._dom == null) {
					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
				}
				// Don't call oldCatchError if we found a Suspense
				return component._childDidSuspend(error, newVNode);
			}
		}
	}
	oldCatchError(error, newVNode, oldVNode, errorInfo);
};

const oldUnmount = options.unmount;
options.unmount = vnode => {
	/** @type {import('./internal').Component} */
	const component = vnode._component;
	if (component) component._unmounted = true;
	if (component && component._onResolve) {
		component._onResolve();
	}

	if (oldUnmount) oldUnmount(vnode);
};

function detachedClone(vnode, detachedParent, parentDom) {
	if (vnode) {
		if (vnode._component && vnode._component.__hooks) {
			vnode._component.__hooks._list.forEach(effect => {
				if (typeof effect._cleanup == 'function') effect._cleanup();
			});

			vnode._component.__hooks = null;
		}

		vnode = cloneVNode(vnode);
		if (vnode._component != null) {
			if (vnode._component._parentDom === parentDom) {
				vnode._component._parentDom = detachedParent;
			}

			vnode._component._bits |= COMPONENT_FORCE;

			vnode._component = null;
		}

		vnode._children =
			vnode._children &&
			vnode._children.map(child =>
				detachedClone(child, detachedParent, parentDom)
			);
	}

	return vnode;
}

function removeOriginal(vnode, detachedParent, originalParent) {
	if (vnode && originalParent) {
		if (typeof vnode.type == 'string') {
			vnode._flags |= FORCE_PROPS_REVALIDATE;
		}

		vnode._original = null;
		vnode._children =
			vnode._children &&
			vnode._children.map(child =>
				removeOriginal(child, detachedParent, originalParent)
			);

		if (vnode._component) {
			if (vnode._component._parentDom === detachedParent) {
				if (vnode._dom) {
					originalParent.appendChild(vnode._dom);
				}
				vnode._component._bits |= COMPONENT_FORCE;
				vnode._component._parentDom = originalParent;
			}
		}
	}

	return vnode;
}

// having custom inheritance instead of a class here saves a lot of bytes
export function Suspense() {
	// we do not call super here to golf some bytes...
	this._pendingSuspensionCount = 0;
	this._suspenders = null;
	this._detachOnNextRender = null;
}

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
Suspense.prototype = new Component();

/**
 * @this {import('./internal').SuspenseComponent}
 * @param {Promise} promise The thrown promise
 * @param {import('./internal').VNode<any, any>} suspendingVNode The suspending component
 */
Suspense.prototype._childDidSuspend = function (promise, suspendingVNode) {
	const suspendingComponent = suspendingVNode._component;

	if (this._suspenders == null) {
		this._suspenders = [];
	}
	this._suspenders.push(suspendingComponent);

	let resolved = false;
	const onResolved = () => {
		if (resolved || this._unmounted) return;

		resolved = true;
		suspendingComponent._onResolve = null;

		onSuspensionComplete();
	};

	suspendingComponent._onResolve = onResolved;

	// Store and null _parentDom to prevent setState/forceUpdate from
	// scheduling renders while suspended. Render would be a no-op anyway
	// since renderComponent checks _parentDom, but this avoids queue churn.
	const originalParentDom = suspendingComponent._parentDom;
	suspendingComponent._parentDom = null;

	const onSuspensionComplete = () => {
		if (!--this._pendingSuspensionCount) {
			// If the suspension was during hydration we don't need to restore the
			// suspended children into the _children array
			if (this.state._suspended) {
				const suspendedVNode = this.state._suspended;
				this._vnode._children[0] = removeOriginal(
					suspendedVNode,
					suspendedVNode._component._parentDom,
					suspendedVNode._component._originalParentDom
				);
			}

			this.setState({ _suspended: (this._detachOnNextRender = null) });

			let suspended;
			while ((suspended = this._suspenders.pop())) {
				// Restore _parentDom before forceUpdate so render can proceed
				suspended._parentDom = originalParentDom;
				suspended.forceUpdate();
			}
		}
	};

	/**
	 * We do not set `suspended: true` during hydration because we want the actual markup
	 * to remain on screen and hydrate it when the suspense actually gets resolved.
	 * While in non-hydration cases the usual fallback -> component flow would occour.
	 */
	if (
		!this._pendingSuspensionCount++ &&
		!(suspendingVNode._flags & MODE_HYDRATE)
	) {
		this.setState({
			_suspended: (this._detachOnNextRender = this._vnode._children[0])
		});
	}
	promise.then(onResolved, onResolved);
};

Suspense.prototype.componentWillUnmount = function () {
	this._suspenders = [];
};

/**
 * @this {import('./internal').SuspenseComponent}
 * @param {import('./internal').SuspenseComponent["props"]} props
 * @param {import('./internal').SuspenseState} state
 */
Suspense.prototype.render = function (props, state) {
	if (this._detachOnNextRender) {
		// When the Suspense's _vnode was created by a call to createVNode
		// (i.e. due to a setState further up in the tree)
		// it's _children prop is null, in this case we "forget" about the parked vnodes to detach
		if (this._vnode._children) {
			const detachedParent = document.createElement('div');
			const detachedComponent = this._vnode._children[0]._component;
			this._vnode._children[0] = detachedClone(
				this._detachOnNextRender,
				detachedParent,
				(detachedComponent._originalParentDom = detachedComponent._parentDom)
			);
		}

		this._detachOnNextRender = null;
	}

	return [
		createElement(Fragment, null, state._suspended ? null : props.children),
		state._suspended && createElement(Fragment, null, props.fallback)
	];
};

export function lazy(loader) {
	let prom;
	let component = null;
	let error;
	let resolved;

	function Lazy(props) {
		if (!prom) {
			prom = loader();
			prom.then(
				exports => {
					if (exports) {
						component = exports.default || exports;
					}
					resolved = true;
				},
				e => {
					error = e;
					resolved = true;
				}
			);
		}

		if (error) {
			throw error;
		}

		if (!resolved) {
			throw prom;
		}

		return component ? createElement(component, props) : null;
	}

	Lazy.displayName = 'Lazy';
	return Lazy;
}
