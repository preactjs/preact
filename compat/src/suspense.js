import { Component, createElement, options, Fragment } from 'preact';
import { MODE_HYDRATE } from '../../src/constants';
import { assign } from './util';

const oldCatchError = options._catchError;
options._catchError = function(error, newVNode, oldVNode) {
	if (error.then) {
		/** @type {import('./internal').Component} */
		let component;
		let vnode = newVNode;

		for (; (vnode = vnode._parent); ) {
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
	oldCatchError(error, newVNode, oldVNode);
};

function detachedClone(vnode, detachedParent, parentDom) {
	if (vnode) {
		if (vnode._component && vnode._component.__hooks) {
			vnode._component.__hooks._list.forEach(effect => {
				if (typeof effect._cleanup == 'function') effect._cleanup();
			});

			vnode._component.__hooks = null;
		}

		vnode = assign({}, vnode);
		if (vnode._component != null) {
			if (vnode._component._parentDom === parentDom) {
				vnode._component._parentDom = detachedParent;
			}
			vnode._component = null;
		}

		if (vnode._children) {
			vnode._children = vnode._children.map(child =>
				detachedClone(child, detachedParent, parentDom)
			);
		}
	}

	return vnode;
}

/**
 * @param {import('./internal').VNode} vnode
 * @param {import('./internal').PreactElement} detachedParent
 * @param {import('./internal').PreactElement} originalParent
 */
function removeOriginal(vnode, detachedParent, originalParent) {
	if (vnode) {
		vnode._original = null;

		if (vnode._children) {
			vnode._children = vnode._children.map(child =>
				removeOriginal(child, detachedParent, originalParent)
			);
		}

		if (vnode._component) {
			// originalParent will be undefined if a node suspended during hydration
			if (
				originalParent != null &&
				vnode._component._parentDom === detachedParent
			) {
				if (vnode._dom) {
					originalParent.insertBefore(vnode._dom, vnode._nextDom);
				}
				vnode._component._force = true;
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
Suspense.prototype._childDidSuspend = function(promise, suspendingVNode) {
	const suspendingComponent = suspendingVNode._component;

	/** @type {import('./internal').SuspenseComponent} */
	const c = this;

	if (c._suspenders == null) {
		c._suspenders = [];
	}
	c._suspenders.push(suspendingComponent);

	const resolve = suspended(c._vnode);

	let resolved = false;
	const onResolved = () => {
		if (resolved) return;

		resolved = true;
		suspendingComponent.componentWillUnmount =
			suspendingComponent._suspendedComponentWillUnmount;

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
		if (!--c._pendingSuspensionCount) {
			let suspendedVNode;
			if (c.state._suspended) {
				suspendedVNode = c.state._suspended;
			} else {
				// _suspended will be unset if we are suspending while hydrating. If so
				// the suspendedVNode is still the first child of Suspense since we
				// never rendered the fallback
				suspendedVNode = c._vnode._children[0];
			}

			c._vnode._children[0] = removeOriginal(
				suspendedVNode,
				suspendedVNode._component._parentDom,
				suspendedVNode._component._originalParentDom
			);

			c.setState({ _suspended: (c._detachOnNextRender = null) });

			let suspended;
			while ((suspended = c._suspenders.pop())) {
				// TODO: If the component that suspended was hydrating, we remount the
				// component so the component instance stored by Suspense is no longer
				// valid. Likely needs to be fixed with backing nodes and a way to
				// trigger a rerender for backing nodes
				if (!(suspended._vnode._mode & MODE_HYDRATE)) {
					suspended.forceUpdate();
				}
			}
		}
	};

	/**
	 * We do not set `suspended: true` during hydration because we want the actual markup
	 * to remain on screen and hydrate it when the suspense actually gets resolved.
	 * While in non-hydration cases the usual fallback -> component flow would occur.
	 */
	const wasHydrating = (suspendingVNode._mode & MODE_HYDRATE) === MODE_HYDRATE;
	if (!c._pendingSuspensionCount++ && !wasHydrating) {
		c.setState({ _suspended: (c._detachOnNextRender = c._vnode._children[0]) });
	}
	promise.then(onResolved, onResolved);
};

Suspense.prototype.componentWillUnmount = function() {
	this._suspenders = [];
};

/**
 * @this {import('./internal').SuspenseComponent}
 * @param {import('./internal').SuspenseComponent["props"]} props
 * @param {import('./internal').SuspenseState} state
 */
Suspense.prototype.render = function(props, state) {
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

	// Wrap fallback tree in a VNode that prevents itself from being marked as aborting mid-hydration:
	/** @type {import('./internal').VNode} */
	const fallback =
		state._suspended && createElement(Fragment, null, props.fallback);

	return [
		// Wrap with a Fragment to prevent the current reconciler from
		// picking the wrong DOM node.
		state._suspended ? null : createElement(Fragment, null, props.children),
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
 * @param {import('./internal').VNode} vnode
 * @returns {((unsuspend: () => void) => void)?}
 */
export function suspended(vnode) {
	/** @type {import('./internal').Component} */
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
