import { Component } from './component';
import { createElement } from './create-element';

// having a "custom class" here saves 50bytes gzipped
export function Suspense(props) {}
Suspense.prototype = new Component();

/**
 * @param {Promise} promise The thrown promise
 */
Suspense.prototype._childDidSuspend = function(promise) {
	this.setState({ _loading: true });
	const cb = () => { this.setState({ _loading: false }); };

	// Suspense ignores errors thrown in Promises as this should be handled by user land code
	promise.then(cb, cb);
};

Suspense.prototype.render = function(props, state) {
	return state._loading ? props.fallback : props.children;
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
