import { Component } from './component';
import { createElement } from './create-element';

// having a "custom class" here saves 50bytes gzipped
export function s(props) {}
s.prototype = new Component();
s.prototype._childDidSuspend = function(e) {
	this.setState({ _loading: true });
	const cb = () => { this.setState({ _loading: false }); };

	// Suspense ignores errors thrown in Promises as this should be handled by user land code
	e.then(cb, cb);
};
s.prototype.render = function(props, state) {
	return state._loading ? props.fallback : props.children;
};

// exporting s as Suspense instead of naming the class iself Suspense saves 4 bytes gzipped
// TODO: does this add the need of a displayName?
export const Suspense = s;

export function lazy(loader) {
	let prom;
	let component;
	let error;
	return function L(props) {
		if (!prom) {
			prom = loader();
			prom.then(
				({ default: c }) => { component = c; },
				e => error = e,
			);
		}

		if (error) {
			throw error;
		}

		if (!component) {
			throw prom;
		}

		return createElement(component, props);
	};
}