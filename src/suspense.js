// import { Component } from './component';
import { enqueueRender } from './component';
import { createElement } from './create-element';

// having a "custom class" here saves 50bytes gzipped
export function Suspense() {}

Suspense.prototype.componentDidCatch = function(err) {
	if (typeof err.then!=='function') return;

	const attemptRendering = () => {
		// enqueueRender returns undefined
		this._pendingPromise = enqueueRender(this);
	};

	// Suspense ignores errors thrown in Promises as this should be handled by user land code
	this._pendingPromise = err.then(attemptRendering, attemptRendering);
};

Suspense.prototype.render = function(props) {
	return this._pendingPromise ? props.fallback : props.children;
};

// export function Suspense(props) {
// 	this.componentDidCatch = this.componentDidCatch || (err => {
// 		if (typeof err.then === 'function') {
// 			this._block = err.then(() => {
// 				this._block = null;
// 				enqueueRender(this);
// 			}, () => {
// 				this._block = null;
// 				enqueueRender(this);
// 			});
// 		}
// 	});
// 	return this._block || props.children;
// }

export function lazy(loader) {
	let prom, component;

	return function Lazy(props) {
		if (!component) {
			prom = prom || loader().then(exports => {
				component = exports.default;
			});

			throw prom;
		}

		return createElement(component, props);
	};
}
