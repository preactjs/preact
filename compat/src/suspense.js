import { Component, createElement, options, Fragment } from 'preact';
import { removeNode } from '../../src/util';

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

function detachDom(vnode) {
	if (vnode) {
		if (typeof vnode.type !== 'function' && vnode._dom) {
			removeNode(vnode._dom);
		} else if (vnode._children) {
			vnode._children.some(detachDom);
		}
	}
}

// having custom inheritance instead of a class here saves a lot of bytes
export function Suspense(props) {
	// we do not call super here to golf some bytes...
	this._suspensions = [];
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
		// From https://twitter.com/Rich_Harris/status/1125850391155965952
		c._suspensions[c._suspensions.indexOf(promise)] =
			c._suspensions[c._suspensions.length - 1];
		c._suspensions.pop();

		if (c._suspensions.length === 0) {
			c._vnode._children[0]._children = c.state._suspended;
			c.setState({ _suspended: null });
		}
	};

	if (c._suspensions.push(promise) === 1) {
		detachDom(c._vnode._children[0]);
		c.setState({ _suspended: c._vnode._children[0]._children }, () => {
			promise.then(onSuspensionComplete, onSuspensionComplete);
		});
		c._vnode._children[0]._children = [];
	} else {
		promise.then(onSuspensionComplete, onSuspensionComplete);
	}
};

Suspense.prototype.render = function(props, state) {
	return [
		createElement(Fragment, null, state._suspended ? [] : props.children),
		createElement(Fragment, null, state._suspended && props.fallback)
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
