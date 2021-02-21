import { Component, createElement, options, Fragment } from 'preact';
import { TYPE_ELEMENT, FORCE_UPDATE, MODE_HYDRATE } from '../../src/constants';
import { getParentDom } from '../../src/tree';
import { assign } from './util';

const oldCatchError = options._catchError;
/** @type {(error: any, internal: import('./internal').Internal) => void} */
options._catchError = function(error, internal) {
	if (error.then) {
		/** @type {import('./internal').Component} */
		let component;
		let handler = internal;

		for (; (handler = handler._parent); ) {
			if ((component = handler._component) && component._childDidSuspend) {
				// Don't call oldCatchError if we found a Suspense
				return component._childDidSuspend(error, internal);
			}
		}
	}
	oldCatchError(error, internal);
};

const oldUnmount = options.unmount;
/** @type {(internal: import('./internal').Internal) => void} */
options.unmount = function(internal) {
	/** @type {import('./internal').Component} */
	const component = internal._component;
	if (component && component._onResolve) {
		component._onResolve();
	}

	// If a component suspended while it was hydrating and is now being unmounted,
	// update it's _flags so it appears to be of TYPE_ELEMENT, causing `unmount`
	// to remove the DOM nodes that were awaiting hydration (which are stored on
	// this internal's _dom property).
	const wasHydrating = (internal._flags & MODE_HYDRATE) === MODE_HYDRATE;
	if (component && wasHydrating) {
		internal._flags |= TYPE_ELEMENT;
	}

	if (oldUnmount) oldUnmount(internal);
};

/**
 *
 * @param {import('./internal').Internal} internal
 * @param {import('./internal').PreactElement} detachedParent
 * @param {import('./internal').PreactElement} parentDom
 */
function detachedClone(internal, detachedParent, parentDom) {
	if (internal) {
		if (internal._component && internal._component.__hooks) {
			internal._component.__hooks._list.forEach(effect => {
				if (typeof effect._cleanup == 'function') effect._cleanup();
			});

			internal._component.__hooks = null;
		}

		internal = assign({}, internal);
		if (internal._component != null) {
			if (internal._component._parentDom === parentDom) {
				internal._component._parentDom = detachedParent;
			}
			internal._component = null;
		}

		if (internal._children) {
			internal._children = internal._children.map(child =>
				detachedClone(child, detachedParent, parentDom)
			);
		}
	}

	return internal;
}

/**
 * @param {import('./internal').Internal} internal
 * @param {import('./internal').PreactElement} detachedParent
 * @param {import('./internal').PreactElement} originalParent
 */
function removeOriginal(internal, detachedParent, originalParent) {
	if (internal) {
		internal._vnodeId = null;

		if (internal._children) {
			internal._children = internal._children.map(child =>
				removeOriginal(child, detachedParent, originalParent)
			);
		}

		if (internal._component) {
			// originalParent will be undefined if a node suspended during hydration
			if (
				originalParent != null &&
				internal._component._parentDom === detachedParent
			) {
				if (internal._dom) {
					originalParent.insertBefore(internal._dom, internal._nextDom);
				}
				internal._flags |= FORCE_UPDATE;
				internal._component._parentDom = originalParent;
			}
		}
	}

	return internal;
}

// having custom inheritance instead of a class here saves a lot of bytes
export function Suspense() {
	// we do not call super here to golf some bytes...
	this._pendingSuspensionCount = 0;
	this._suspenders = null;
	this._detachOnNextRender = null;
	this._parentDom = null;
}

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
Suspense.prototype = new Component();

/**
 * @this {import('./internal').SuspenseComponent}
 * @param {Promise} promise The thrown promise
 * @param {import('./internal').Internal} suspendingInternal The suspending component
 */
Suspense.prototype._childDidSuspend = function(promise, suspendingInternal) {
	// @TODO Investigate what this logic does when a component throws while
	// rendering the fallback...

	const suspendingComponent = suspendingInternal._component;

	/** @type {import('./internal').SuspenseComponent} */
	const c = this;

	if (c._suspenders == null) {
		c._suspenders = [];
	}
	c._suspenders.push(suspendingComponent);

	const resolve = suspended(c._internal);

	let resolved = false;
	const onResolved = () => {
		if (resolved) return;

		resolved = true;
		suspendingComponent._onResolve = null;

		if (resolve) {
			resolve(onSuspensionComplete);
		} else {
			onSuspensionComplete();
		}
	};

	suspendingComponent._onResolve = onResolved;

	const onSuspensionComplete = () => {
		if (!--c._pendingSuspensionCount) {
			// /** @type {import('./internal').Internal} */
			// let suspendedInternal;
			// if (c.state._suspended) {
			// 	suspendedInternal = c.state._suspended;
			// } else {
			// 	// _suspended will be unset if we are suspending while hydrating. If so
			// 	// the suspendedInternal is still the first child of Suspense since we
			// 	// never rendered the fallback
			// 	suspendedInternal = c._internal._children[0];
			// }
			//
			// c._internal._children[0] = removeOriginal(
			// 	suspendedInternal,
			// 	suspendedInternal._component._parentDom,
			// 	suspendedInternal._component._originalParentDom
			// );

			c.setState({ _suspended: (c._detachOnNextRender = null) });

			let suspended;
			while ((suspended = c._suspenders.pop())) {
				// TODO: If the component that suspended was hydrating, we remount the
				// component so the component instance stored by Suspense is no longer
				// valid. Likely needs to be fixed with backing nodes and a way to
				// trigger a rerender for backing nodes
				if (!(suspended._internal._flags & MODE_HYDRATE)) {
					suspended.forceUpdate();
				}
			}

			this._parentDom = null;
		}
	};

	/**
	 * We do not set `suspended: true` during hydration because we want the actual markup
	 * to remain on screen and hydrate it when the suspense actually gets resolved.
	 * While in non-hydration cases the usual fallback -> component flow would occur.
	 */
	const wasHydrating =
		(suspendingInternal._flags & MODE_HYDRATE) === MODE_HYDRATE;

	if (!c._pendingSuspensionCount++ && !wasHydrating) {
		this._parentDom = document.createElement('div');
		c.setState({
			_suspended: (c._detachOnNextRender = c._internal._children[0])
		});
	}

	promise.then(onResolved, onResolved);
};

Suspense.prototype.componentWillUnmount = function() {
	this._suspenders = [];
	this._parentDom = null;
};

/**
 * @this {import('./internal').SuspenseComponent}
 * @param {import('./internal').SuspenseComponent["props"]} props
 * @param {import('./internal').SuspenseState} state
 */
Suspense.prototype.render = function(props, state) {
	// if (this._detachOnNextRender) {
	// 	// @TODO Is this logic still needed with the move to backing tree?
	// 	// When the Suspense's _vnode was created by a call to createVNode
	// 	// (i.e. due to a setState further up in the tree)
	// 	// it's _children prop is null, in this case we "forget" about the parked vnodes to detach
	// 	if (this._internal._children) {
	// 		// @TODO: Consider rebuilding suspense detached parent logic to use root nodes
	// 		const detachedParent = document.createElement('div');
	// 		const detachedComponent = this._internal._children[0]._component;
	// 		this._internal._children[0] = detachedClone(
	// 			this._detachOnNextRender,
	// 			detachedParent,
	// 			(detachedComponent._originalParentDom = detachedComponent._parentDom)
	// 		);
	// 	}
	//
	// 	this._detachOnNextRender = null;
	// }

	if (this._parentDom == null) {
		this._parentDom = getParentDom(this._internal);
	}

	// Wrap fallback tree in a VNode that prevents itself from being marked as aborting mid-hydration:
	const fallback =
		state._suspended && createElement(Fragment, null, props.fallback);

	return [
		createElement(Fragment, { _parentDom: this._parentDom }, props.children),
		fallback
	];
};

/**
 * Checks and calls the parent component's _suspended method, passing in the
 * suspended Internal. This is a way for a parent (e.g. SuspenseList) to get
 * notified that one of its children/descendants suspended.
 *
 * The parent MAY return a callback. The callback will get called when the
 * suspension resolves, notifying the parent of the fact. Moreover, the callback
 * gets function `unsuspend` as a parameter. The resolved child descendant will
 * not actually get unsuspended until `unsuspend` gets called. This is a way for
 * the parent to delay unsuspending.
 *
 * If the parent does not return a callback then the resolved Internal gets
 * unsuspended immediately when it resolves.
 *
 * @param {import('./internal').Internal} internal
 * @returns {((unsuspend: () => void) => void)?}
 */
export function suspended(internal) {
	let component = internal._parent._component;
	return component && component._suspended && component._suspended(internal);
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
