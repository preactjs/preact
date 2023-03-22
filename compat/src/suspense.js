import {
	Component,
	createElement,
	options,
	Fragment,
	createPortal
} from 'preact';
import { TYPE_ELEMENT, MODE_HYDRATE } from '../../src/constants';
import { getParentDom } from '../../src/tree';

const oldCatchError = options._catchError;
/** @type {(error: any, internal: import('./internal').Internal, errorInfo: any) => void} */
options._catchError = function(error, internal, errorInfo) {
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
	oldCatchError(error, internal, errorInfo);
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
	// update it's flags so it appears to be of TYPE_ELEMENT, causing `unmount`
	// to remove the DOM nodes that were awaiting hydration (which are stored on
	// this internal's _dom property).
	const wasHydrating = (internal.flags & MODE_HYDRATE) === MODE_HYDRATE;
	if (component && wasHydrating) {
		internal.flags |= TYPE_ELEMENT;
	}

	if (oldUnmount) oldUnmount(internal);
};

// having custom inheritance instead of a class here saves a lot of bytes
export function Suspense() {
	// we do not call super here to golf some bytes...
	this._pendingSuspensionCount = 0;
	/** @type {Array<import('./internal').Internal>} */
	this._suspenders = null;
	/** @type {import('./internal').PreactElement} */
	this._parentDom = null;
	/** @type {number} */
	this._portalVNodeId = 0;
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
	const suspendingComponent = suspendingInternal._component;
	if (suspendingComponent._onResolve != null) {
		// This component has already been handled by a Suspense component. Do
		// nothing
		return;
	}

	/** @type {import('./internal').SuspenseComponent} */
	const c = this;

	if (c._suspenders == null) {
		c._suspenders = [];
	}
	c._suspenders.push(suspendingComponent);

	let resolved = false;
	const onResolved = () => {
		if (resolved) return;

		resolved = true;
		suspendingComponent._onResolve = null;

		onSuspensionComplete();
	};

	suspendingComponent._onResolve = onResolved;

	const onSuspensionComplete = () => {
		if (!--c._pendingSuspensionCount) {
			this._parentDom = null;
			c.setState({ _suspended: false });

			let suspended;
			while ((suspended = c._suspenders.pop())) {
				suspended.forceUpdate();
			}
		}
	};

	/**
	 * We do not set `suspended: true` during hydration because we want the actual markup
	 * to remain on screen and hydrate it when the suspense actually gets resolved.
	 * While in non-hydration cases the usual fallback -> component flow would occur.
	 */
	const wasHydrating =
		(suspendingInternal.flags & MODE_HYDRATE) === MODE_HYDRATE;

	if (!c._pendingSuspensionCount++ && !wasHydrating) {
		this._parentDom = document.createElement('div');
		c.setState({ _suspended: true });
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
	if (this._parentDom == null) {
		this._parentDom = getParentDom(this._internal);
	}

	// Wrap fallback tree in a VNode that prevents itself from being marked as aborting mid-hydration:
	const fallback =
		state._suspended && createElement(Fragment, null, props.fallback);

	const portal = createPortal(props.children, this._parentDom);
	if (state._suspended) {
		// If we are suspended, don't rerender all of the portal's children. Instead
		// just reorder the Portal's children
		portal._vnodeId = this._portalVNodeId;
	} else {
		this._portalVNodeId = portal._vnodeId;
	}

	return [portal, fallback];
};

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
