import { Component, enqueueRender } from './component';
import { createElement as h, Fragment } from './create-element';
import { toChildArray } from './diff/children';
/** @jsx h */

// having a "custom class" here saves 50bytes gzipped
export function Suspense(props) {
	this.shouldRenderFallback = this.shouldRenderFallback.bind(this);
	this.shouldRenderTextNode = this.shouldRenderTextNode.bind(this);
	const mapChildren = child => {
		if (typeof child === 'string') {
			return <SuspenseTextChild shouldRender={this.shouldRenderTextNode}>{child}</SuspenseTextChild>;
		}
		
		if (child.type === Fragment) {
			child.props.children = toChildArray(child.props.children).map(mapChildren);
		}

		return child;
	};
	this.$$children = toChildArray(props.children).map(mapChildren);
	this.pendingSuspensions = [];
}
Suspense.prototype = new Component();

/**
 * @param {Promise} promise The thrown promise
 */
Suspense.prototype._childDidSuspend = function(promise, suspendingComponent) {
	this.pendingSuspensions.push(promise);

	// TODO: support multiple suspensions under one Suspense
	suspendingComponent._suspended = true;
	this._loading = true;
	enqueueRender(this.fallback._component);
	// TODO: when the component producing the dom node changes DOM, the display: none is reset
	this.$$children.forEach(vnode => {
		// TODO: detect SuspenseTextChild in a way to support multi copies of preact
		if (vnode.type === SuspenseTextChild) {
			enqueueRender(vnode._component);
		}
		else if (vnode._dom) {
			if (vnode._dom.style) {
				if (!('_displayBeforeSuspend' in vnode)) {
					vnode._displayBeforeSuspend = vnode._dom.style.display;
				}
				vnode._dom.style.display = 'none';
				if (vnode._component) {
					vnode._component._suspendChildDom = true;
				}
				// TODO: detect fragment in a way to support multi copies of preact
				else if (vnode.type ===  Fragment) {
					console.log('⚠️  Fragment', vnode);
				}
				else {
					// TODO: does this happen?
					console.log('☢️  Missing _component on node', vnode);
				}
			}
			else {
				// This happens for text nodes
				console.log('☢️  Missing style prop on ', vnode._dom, vnode);
			}
		}
		else {
			console.log('☢️  Missing _dom on', c);
		}
	});
	const cb = () => {
		this.pendingSuspensions = this.pendingSuspensions.filter(pending => pending !== promise);
		this._loading = this.pendingSuspensions.length > 0;

		console.log('suspension completed', this.pendingSuspensions.length, 'remaining',  this._loading);

		suspendingComponent._suspended = false;
		
		enqueueRender(suspendingComponent);

		if (!this._loading) {
			console.log('rendering fallback');
			enqueueRender(this.fallback._component);
			
			this.$$children.forEach(vnode => {
				if (vnode.type === SuspenseTextChild) {
					console.log('Re-rendering text', vnode.props.children);
					enqueueRender(vnode._component);
				}
				else if (vnode._dom) {
					console.log('checking dom', vnode._dom);
					if (vnode._dom.style && '_displayBeforeSuspend' in vnode) {
						if (vnode._component) {
							vnode._component._suspendChildDom = false;
						}
						else {
							console.log('⚠️ Missing _component on', vnode);
						}
						vnode._dom.style.display = vnode._displayBeforeSuspend;
						delete vnode._displayBeforeSuspend;
					}
				}
			});
		}
	};

	// Suspense ignores errors thrown in Promises as this should be handled by user land code
	promise.then(cb, cb);
};

Suspense.prototype.shouldRenderTextNode = function() {
	return !this._loading;
};

Suspense.prototype.shouldRenderFallback = function() {
	return this._loading;
};

function Fallback({ shouldRenderFallback, children }) {
	console.log('Fallback()', shouldRenderFallback());
	return shouldRenderFallback() ? children : null;
}

function SuspenseTextChild({ shouldRender, children })  {
	console.log('SuspenseTextChild()', shouldRender(), children);
	return shouldRender() ? children : null;
}

Suspense.prototype.render = function(props) {
	this.fallback =	(
		<Fallback shouldRenderFallback={this.shouldRenderFallback}>
			{props.fallback}
		</Fallback>
	);

	return (
		<Fragment>
			{this.$$children}
			{this.fallback}
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
