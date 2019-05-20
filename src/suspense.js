import { Component } from './component';
import { unmount } from './diff/index';
import { removeNode } from './util';
import { createElement } from './create-element';

function removeDom(vnode) {
	let r = vnode._component;
	if (r != null) {
		if (r = r._prevVNode) removeDom(r);
	}
	else if ((r = vnode._children) && typeof vnode.type === 'function') {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) removeDom(r[i]);
		}
	}

	const dom = vnode._dom;
	if (dom) {
		removeNode(dom);
	}
}

// having a "custom class" here saves 50bytes gzipped
export function Suspense(props) {
	// we do not call super here to golf some bytes...
	this._suspensions = [];
}
// when doing proper inheritance we should not call new Component() here. See https://stackoverflow.com/a/4389429
Suspense.prototype = new Component();
// we do not set the constructor here to golf some bytes:
// Suspense.prototype.constructor = Suspense

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

			if (this._suspended) {
				this._suspended = false;
				
				// remove fallback
				unmount(this.props.fallback);

				// make preact think we had mounted the parkedVNode previously...
				this._prevVNode = this._parkedVnode;
				this._parkedVnode = null;

				this.forceUpdate();
			}
		}
	};

	const timeoutOrSuspensionsCompleted = () => {
		if (this._timeoutCompleted && this._suspensions.length > 0 && !this._suspended) {
			this._suspended = true;
			
			// park old vnode & remove dom
			removeDom(this._parkedVnode = this._prevVNode);
			this._prevVNode = null;

			// render and mount fallback
			this.forceUpdate();
		}
	};

	if (!this._timeout) {
		this._timeoutCompleted = false;

		if (this.props.maxDuration == null || this.props.maxDuration == 0) {
			// even tough there is not maxDuration configured we will defer the suspension
			// as we want the rendering/diffing to finish as it might yield other suspensions
			this._timeout = Promise.resolve();
		}
		else {
			this._timeout = new Promise((res) => {
				setTimeout(res, this.props.maxDuration);
			});
		}

		this._timeout = this._timeout.then(() => {
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
	return this._suspended ? props.fallback : props.children;
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
