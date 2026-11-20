import { Component, Fragment, createElement, options } from 'preact';
import {
	COMPONENT_FORCE,
	MODE_HYDRATE,
	REF_DETACHED,
	UNDEFINED,
	VNODE_MARKER
} from '../../src/constants';
import { assign } from './util';

function initSuspenseHooks() {
	const oldCatchError = options._catchError;
	options._catchError = (error, newVNode, oldVNode, errorInfo) => {
		if (error && error.then) {
			/** @type {import('./internal').Component} */
			let component;
			let boundary;
			let marker;
			let child;
			let vnode = newVNode;

			while ((vnode = (child = vnode)._parent)) {
				if ((component = vnode._component) && component._childDidSuspend) {
					// While hydrating, the content of a boundary in front of a
					// streamed range suspends as a whole: the server marks the
					// range, not what each component rendered in it, so nothing in it
					// can keep a part of it while its siblings go on. The content
					// kept the range before, or core left its marker on the
					// boundary's `_dom`. Only a server that marks every boundary
					// writes `$s?`, `$s::` and `$s:`: with an older one, the marker
					// may be that of a boundary further down.
					if (
						newVNode._flags & MODE_HYDRATE &&
						((marker = (child._component || 0)._excess) ||
							/^\$s([?!]|:(:|$))/.test(((marker = vnode._dom) || 0).data))
					) {
						// Thrown on until the content itself catches it
						if (newVNode != child) throw error;
						newVNode._component._excess = marker;
						// What it rendered so far is rendered again when it resumes.
						// A range that held a fallback loses what was put in it.
						park(newVNode._children, marker.data[2] != ':');
						newVNode._children = [];
						boundary = component;
						break;
					}
					// A boundary the server didn't get to is part of the range of
					// one further up
					boundary = boundary || component;
				}
			}

			if (boundary) {
				// A component that suspends before ever committing has no state
				// worth keeping; mounted ones keep their hooks while parked.
				if (oldVNode && !oldVNode._component)
					newVNode._component.__hooks = UNDEFINED;
				// Don't call oldCatchError if we found a Suspense
				return boundary._childDidSuspend(error, newVNode);
			}
		}
		oldCatchError(error, newVNode, oldVNode, errorInfo);
	};

	const oldUnmount = options.unmount;
	options.unmount = vnode => {
		/** @type {import('./internal').Component} */
		const component = vnode._component;
		if (component && component._onResolve) {
			component._onResolve();
		}

		if (oldUnmount) oldUnmount(vnode);
	};
}

/**
 * Detach the components of a hydration pass that was given up on, and remove
 * the DOM it created when asked to, or when it is a portal's.
 */
function park(children, remove) {
	(children || []).some(vnode => {
		if (vnode) {
			if (vnode._component) {
				vnode._component._parentDom = vnode._component._globalContext = null;
			} else if (remove && vnode._dom) {
				vnode._dom.remove();
			}
			park(vnode._children, remove || vnode.props._parentDom);
		}
	});
}

function detachedClone(vnode, detachedParent, parentDom) {
	if (vnode) {
		const hooks = vnode._component && vnode._component.__hooks;
		if (hooks) {
			hooks._list.forEach(effect => {
				// Only effects carry `_passive`; clearing `_args` makes them run
				// again when the tree is revealed, memo/ref state stays intact.
				if (effect._passive != null) {
					if (typeof effect._cleanup == 'function') effect._cleanup();
					effect._cleanup = effect._args = UNDEFINED;
				}
			});
			// Drop effects queued by the aborted render; `options._render` swaps in
			// a fresh `_pendingEffects` array before anything is pushed again, so
			// sharing one empty array here is safe.
			hooks._pendingEffects = vnode._component._renderCallbacks = [];
		}

		// Unmounting the clone detaches DOM refs; flag the original so the
		// reveal attaches them again.
		if (typeof vnode.type == 'string') vnode._flags |= REF_DETACHED;

		vnode = assign({ constructor: VNODE_MARKER }, vnode);
		if (vnode._component != null) {
			if (vnode._component._parentDom == parentDom) {
				vnode._component._parentDom = detachedParent;
			}

			vnode._component._bits |= COMPONENT_FORCE;

			// Keep component refs attached while parked, as object refs already are
			vnode._component = vnode.ref = null;
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
		vnode._original = null;
		vnode._children =
			vnode._children &&
			vnode._children.map(child =>
				removeOriginal(child, detachedParent, originalParent)
			);

		if (vnode._component) {
			if (vnode._component._parentDom == detachedParent) {
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
function createSuspense() {
	initSuspenseHooks();

	function Suspense() {
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
			// Core nulls `_parentDom` when the boundary unmounts.
			if (resolved || !this._parentDom) return;

			resolved = true;
			suspendingComponent._onResolve = null;

			onSuspensionComplete();
		};

		suspendingComponent._onResolve = onResolved;

		// Store and null _parentDom to prevent setState/forceUpdate from
		// scheduling renders while suspended. Render would be a no-op anyway
		// since process() checks _parentDom, but this avoids queue churn.
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
					// Skip suspenders unmounted meanwhile: unmount() nulls
					// _globalContext, and a dead vnode can't be re-rendered.
					if (suspended._globalContext) {
						// Restore _parentDom before forceUpdate so render can proceed
						suspended._parentDom = originalParentDom;
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
		if (this.state._suspended) this._vnode._children[0] = this.state._suspended;
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

	return Suspense;
}

export const Suspense = /* @__PURE__ */ createSuspense();

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
