import { Component } from './component';
import { createElement as h, Fragment } from './create-element';
/** @jsx h */

// having a "custom class" here saves 50bytes gzipped
export function Suspense(props) {}
Suspense.prototype = new Component();

/**
 * @param {Promise} promise The thrown promise
 */
Suspense.prototype._childDidSuspend = function(promise, suspendingComponent) {
	suspendingComponent._suspended = true;
	this.setState({ _loading: true });
	const cb = () => { suspendingComponent._suspended = false; this.setState({ _loading: false }); };

	// Suspense ignores errors thrown in Promises as this should be handled by user land code
	promise.then(cb, cb);
};

Suspense.prototype.render = function(props, state) {
	return (
		<Fragment>
			{props.children}
			{state._loading && props.fallback}
		</Fragment>
	);
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

		return h(component, props);
	}

	Lazy.displayName = 'Lazy';

	return Lazy;
}
