import { Component } from './component';
import { unmount } from './diff/index';
import { removeNode } from './util';
import { createElement } from './create-element';

function removeDom(vnode) {
	let tmp = vnode._component;
	if (tmp != null) {
		if (tmp = tmp._prevVNode) removeDom(tmp);
	}
	else if ((tmp = vnode._children) && vnode._lastDomChild) {
		for (let i = 0; i < tmp.length; i++) {
			if (tmp[i]) removeDom(tmp[i]);
		}
	}

	if (tmp = vnode._dom) {
		removeNode(tmp);
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
	this._suspensions.push(promise);
	let len = this._suspensions.length;

	const suspensionsCompleted = () => {
		// make sure we did not add any more suspensions
		if (len === this._suspensions.length) {
			// clear old suspensions
			this._suspensions = [];

			// reset the timeout
			this._timeout = null;

			// remove fallback
			unmount(this.props.fallback);

			// make preact think we had mounted the parkedVNode previously...
			this._prevVNode = this._parkedVnode;
			this._parkedVnode = null;

			this.forceUpdate();
		}
	};

	const timeoutOrSuspensionsCompleted = () => {
		if (this._timeoutCompleted && this._suspensions.length && !this._parkedVnode) {
			// park old vnode & remove dom
			removeDom(this._parkedVnode = this._prevVNode);
			this._prevVNode = null;

			// render and mount fallback
			this.forceUpdate();
		}
	};

	if (!this._timeout) {
		this._timeoutCompleted = false;

		this._timeout = (
			this.props.maxDuration
				? new Promise((res) => {
					setTimeout(res, this.props.maxDuration);
				})
				// even tough there is not maxDuration configured we will defer the suspension
				// as we want the rendering/diffing to finish as it might yield other suspensions
				: Promise.resolve()
		)
			.then(() => {
				this._timeoutCompleted = true;
			});
	}

	// __test__suspensions_timeout_race is assigned here to let tests await this...
	this.__test__suspensions_timeout_race = Promise.race([
		this._timeout,
		// Suspense ignores errors thrown in Promises as this should be handled by user land code
		Promise.all(this._suspensions).then(suspensionsCompleted, suspensionsCompleted)
	])
		.then(timeoutOrSuspensionsCompleted);
};

Suspense.prototype.render = function(props, state) {
	// When _parkedVnode is set, we are in suspension state
	return this._parkedVnode ? props.fallback : props.children;
};

export function lazy(loader) {
	let prom;
	let component;
	let error;

	function Lazy(props) {
		if (!prom) {
			prom = loader();
			prom.then(
				(exports) => { component = exports.default; },
				(e) => { error = e; },
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

	return Lazy;
}
