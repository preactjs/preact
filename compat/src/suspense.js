import { Component, createElement, options, Fragment } from 'preact';
import { assign } from '../../src/util';

const oldCatchError = options._catchError;
options._catchError = function(error, newVNode, oldVNode) {
	if (error.then && oldVNode) {
		/** @type {import('./internal').Component} */
		let component;
		let vnode = newVNode;

		for (; (vnode = vnode._parent); ) {
			if ((component = vnode._component) && component._childDidSuspend) {
				if (oldVNode) {
					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
				}

				component._childDidSuspend(error);
				return; // Don't call oldCatchError if we found a Suspense
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
 */
Suspense.prototype._childDidSuspend = function(promise) {
	/** @type {import('./internal').SuspenseComponent} */
	const c = this;

	const onSuspensionComplete = () => {
		if (!--c._suspensions) {
			c._vnode._children[0] = c.state._suspended;
			c.setState({ _suspended: (c._detachOnNextRender = null) });
		}
	};

	if (!c._suspensions++) {
		c.setState({ _suspended: (c._detachOnNextRender = c._vnode._children[0]) });
	}
	promise.then(onSuspensionComplete, onSuspensionComplete);
};

Suspense.prototype.render = function(props, state) {
	if (this._detachOnNextRender) {
		this._vnode._children[0] = detachedClone(this._detachOnNextRender);
		this._detachOnNextRender = null;
	}

	return [
		createElement(Fragment, null, state._suspended ? null : props.children),
		state._suspended && props.fallback
	];
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
					component = exports.default;
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
