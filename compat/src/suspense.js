import { Component, Fragment, createElement, options } from 'preact';
import {
	COMPONENT_FORCE,
	MODE_HYDRATE,
	MODE_SUSPENDED,
	REF_DETACHED,
	UNDEFINED,
	VNODE_MARKER
} from '../../src/constants';
import { useId } from 'preact/hooks';
import { assign } from './util';

/** Core's `rangeEnd()`, handed over with the first range a boundary takes. */
let rangeEnd;

function initSuspenseHooks() {
	const oldCatchError = options._catchError;
	options._catchError = (error, newVNode, oldVNode, errorInfo) => {
		if (error && error.then) {
			/** @type {import('./internal').Component} */
			let component;
			let vnode = newVNode;

			// A boundary that is still to hydrate suspends itself, so the search
			// starts at the vnode that threw.
			for (; vnode; vnode = vnode._parent) {
				if ((component = vnode._component) && component._childDidSuspend) {
					// Below a boundary that hydrates its range (it has `_excess`
					// for as long as that takes), suspending is the boundary's
					// call: the error travels up to it, the range stays as the
					// server sent it and hydrates in one go later. Core flags
					// what suspended while it was taking over existing DOM.
					if (
						component._excess &&
						vnode != newVNode &&
						newVNode._flags & MODE_SUSPENDED
					) {
						throw error;
					}

					// A component that suspends before ever committing has no state
					// worth keeping; mounted ones keep their hooks while parked.
					if (oldVNode && !oldVNode._component)
						newVNode._component.__hooks = UNDEFINED;
					// Don't call oldCatchError if we found a Suspense
					return component._childDidSuspend(error, newVNode);
				}
			}
		}
		oldCatchError(error, newVNode, oldVNode, errorInfo);
	};

	// A boundary hydrates the range the server marked for it and nothing else.
	// The comment that opens it reads `$s=` when its content is there, `$s?id`
	// while the server is still to send it and `$s!` when the client has to
	// render it (`$s!:id` from the island format too).
	options._claim = (component, nodes, cursor, end) => {
		if (component._childDidSuspend) {
			// The marker is the first node from the cursor on that is neither a
			// comment nor an instruction, past the ones already hydrated. The
			// cursor can be gone: the leftovers of the range before it.
			let i = nodes.indexOf(cursor),
				range = [],
				marker;
			// Any other boundary marker (an opener in an older format, or the
			// end of the range around us) ends the search.
			for (
				rangeEnd = end, i = i < 0 ? 0 : i;
				(marker = nodes[i++]) === null ||
				(marker && marker.nodeType > 6 && !/^\/?\$s/.test(marker.data));
			);
			if (marker && /^\$s[=?!]/.test(marker.data)) {
				range.push(
					(marker = rangeEnd((component._excess = marker), range)) &&
						marker.nextSibling
				);
				// The parent doesn't hydrate any of it
				nodes.fill(null, i - 1, i + range.length);
				return range;
			}
		}
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
 * Detach the components of a render that is thrown away, and the handlers it
 * attached: the DOM is the server's again.
 */
function discard(vnode) {
	if (vnode) {
		// A portal mounted fresh: its DOM isn't the server's, it goes
		if (vnode.props._parentDom) removeDom(vnode);
		if (vnode._component) vnode._component._parentDom = null;
		else if (vnode._dom) vnode._dom._listeners = null;
		if (vnode._children) vnode._children.some(discard);
	}
}

/** Remove the DOM nodes a vnode rendered */
function removeDom(vnode) {
	if (vnode) {
		if (typeof vnode.type == 'string') vnode._dom.remove();
		else if (vnode._children) vnode._children.some(removeDom);
		else if (vnode._dom) vnode._dom.remove();
	}
}

/**
 * The markers of a range still to come stay for the server's script (see
 * componentWillUnmount), so no copy that starts with one removes it.
 */
function clone(vnode, tmp) {
	vnode = assign({ constructor: VNODE_MARKER }, vnode);
	if ((tmp = vnode._dom) && tmp.nodeType == 8 && tmp.data[2] == '?')
		vnode._dom = null;
	return vnode;
}

function detachedClone(vnode, detachedParent, parentDom) {
	if (vnode) {
		// A boundary that is still to hydrate has no DOM of its own to park,
		// only the range the server sent. Unmounting this copy drops that range
		// and the boundary mounts anew when the tree is revealed.
		if (vnode._flags & MODE_SUSPENDED && vnode._component._childDidSuspend) {
			const copy = clone(vnode);
			vnode._component = vnode._dom = null;
			vnode._flags &= ~MODE_SUSPENDED;
			return copy;
		}

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

		vnode = clone(vnode);
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
				// (`__w` is 0 on the marker of a range that was dropped above)
				if (vnode._dom && vnode._dom.__w !== 0) {
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
		// A boundary that waits to hydrate is the one that suspended: its own
		// `_parentDom` tells `onResolved` whether it is still mounted. What
		// hydrated below it before something suspended is thrown away, the
		// range hydrates from scratch when it resumes.
		const originalParentDom = suspendingComponent._parentDom;
		if (suspendingComponent != this) suspendingComponent._parentDom = null;
		else {
			suspendingVNode._children.some(discard);
			suspendingVNode._children = [];
		}

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
			!(suspendingVNode._flags & MODE_HYDRATE) &&
			// A boundary that is still to hydrate keeps its server DOM instead
			suspendingComponent != this
		) {
			this.setState({
				_suspended: (this._detachOnNextRender = this._vnode._children[0])
			});
		}
		promise.then(onResolved, onResolved);
	};

	/**
	 * A boundary that waits to hydrate keeps waiting when its parent renders it
	 * again, only its own retry gets through (forceUpdate() skips this).
	 * @this {import('./internal').SuspenseComponent}
	 */
	Suspense.prototype.shouldComponentUpdate = function () {
		return !this._excess;
	};

	Suspense.prototype.componentWillUnmount = function () {
		this._suspenders = [];
		if (this.state._suspended) this._vnode._children[0] = this.state._suspended;

		// The browser may be streaming this boundary's chunk into its range, so
		// only the fallback goes: the markers and the instructions between them
		// stay, and the script that ends the chunk clears a range whose `__w`
		// is 0. Without its name `<?start>` is no target for a chunk that is
		// still to come.
		let marker = this._excess,
			node,
			end = marker;
		if (marker && marker.data[2] == '?') {
			this._excess = null;
			marker.__w = 0;
			// Neither this boundary nor a component above it that starts with the
			// marker removes it when it unmounts
			for (node = this._vnode; node && node._dom == marker; node = node._parent)
				node._dom = null;
			// Nothing goes when the closer isn't a later sibling (yet)
			while ((end = end.nextSibling) && end.data != '/' + marker.data);
			while (end && (node = marker.nextSibling) != end) {
				if (node.nodeType == 7) {
					node.data = '';
					marker = node;
				} else node.remove();
			}
		}
	};

	/**
	 * @this {import('./internal').SuspenseComponent}
	 * @param {import('./internal').SuspenseComponent["props"]} props
	 * @param {import('./internal').SuspenseState} state
	 */
	Suspense.prototype.render = function (props, state) {
		// Ids inside a boundary come from its own counter, so they don't depend
		// on when it resolves on the server or hydrates on the client.
		this._mask || (this._mask = [useId(), 0]);

		// Set while this boundary hydrates the range the server marked for it
		const marker = this._excess;
		let fallback = state._suspended;
		if (marker) {
			// Nothing below has rendered yet, whatever an earlier attempt did
			this._mask[1] = 0;

			if (marker.data[2] == '?') {
				// The content is still to come: the script that ends its chunk
				// wakes us up, and so does the init script's DOMContentLoaded
				// handler when the response ends without it.
				if (marker.ownerDocument.readyState == 'loading') {
					throw (
						marker._promise ||
						(marker._promise = new Promise(resolve => (marker.__w = resolve)))
					);
				}
				// The response ended without this boundary's content
				marker.data = '$s!';
			}

			// The server left `$s!` to the client: this render hydrates the
			// fallback it sent, and the next one renders the content.
			fallback = marker.data[2] == '!';

			// Once this render commits the range is hydrated, and its markers go.
			// (A shouldComponentUpdate() bailout also runs pending callbacks, with
			// the boundary still suspended.) One callback however often this
			// render is tried.
			this._done = this._done || (() => {
				const m = this._excess;
				if (m && !(this._vnode._flags & MODE_SUSPENDED)) {
					this._excess = null;
					(rangeEnd(m) || m).remove();
					m.remove();
					if (m.data[2] == '!') this.forceUpdate();
				}
			});
			if (!this._renderCallbacks.includes(this._done))
				this._renderCallbacks.push(this._done);
		}

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
			createElement(Fragment, null, fallback ? null : props.children),
			fallback && createElement(Fragment, null, props.fallback)
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
