import { Component } from './component';
import { unmount } from './diff/index';
import { removeNode } from './util';
import { createElement } from './create-element';

function removeDom(vnode, indent = '') {
	let r = vnode._component;
	if (r != null) {
		if (r = r._prevVNode) removeDom(r, indent + '  ');
	}
	else if ((r = vnode._children) && typeof vnode.type === 'function') {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) removeDom(r[i], indent + '  ');
		}
	}

	const dom = vnode._dom;
	if (dom) {
		removeNode(dom);
	}
}

// having a "custom class" here saves 50bytes gzipped
export function Suspense(props) {
	this._suspensions = [];
}
Suspense.prototype = new Component();

/**
 * @param {Promise} promise The thrown promise
 */
Suspense.prototype._childDidSuspend = function(promise, suspendingComponent) {
	this._suspensions.push(promise);
	let len = this._suspensions.length;

	const promiseCompleted = () => {
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

				// enqueueRender(suspendingComponent);
			}
		}
	};

	const timeoutOrPromiseCompleted = () => {
		if (this._timeoutCompleted && this._suspensions.length > 0 && !this._suspended) {
			this._suspended = true;
			
			// park old vnode & remove dom
			this._parkedVnode = this._prevVNode;
			this._prevVNode = null;

			removeDom(this._parkedVnode);

			// render and mount fallback
			this.forceUpdate();
		}
	};

	if (this.props.maxDuration == null || this.props.maxDuration == 0) {
		this._timeoutCompleted = true;
		timeoutOrPromiseCompleted();

		// Suspense ignores errors thrown in Promises as this should be handled by user land code
		promise.then(promiseCompleted, promiseCompleted);

		return;
	}

	if (!this._timeout) {
		this._timeoutCompleted = false;
		this._timeout = new Promise((res) => {
			setTimeout(() => {
				this._timeoutCompleted = true;
			}, this.props.maxDuration);
		});
	}

	// _p is assigned here to let tests await this...
	this._p = Promise.race([
		this._timeout,
		// Suspense ignores errors thrown in Promises as this should be handled by user land code
		promise.then(promiseCompleted, promiseCompleted)
	])
		.then(timeoutOrPromiseCompleted);
};

Suspense.prototype.render = function(props, state) {
	console.log('Suspense.render()', this._suspended);
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
