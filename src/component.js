import { assign } from './util';
import { diff, flushMounts } from './diff/index';
// import { diff, diffLevel } from './diff/index';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
export function Component(props, context) {
	this.props = props;
	this.context = context;
	// if (this.state==null) this.state = {};
	// this.state = {};
	// this._dirty = true;
	// this._renderCallbacks = []; // Only class components

	// Other properties that Component will have set later,
	// shown here as commented out for quick reference
	// this.base = null;
	// this._ancestorComponent = null; // Always set right after instantiation
	// this._vnode = null;
	// this._nextState = null; // Only class components
	// this._previousVTree = null;
	// this._processingException = null; // Always read, set only when handling error
	// this._constructor = null; // Only functional components, always set right after instantiation
}

/**
 * Update component state and schedule a re-render.
 * @param {object | ((s: object, p: object) => object)} update A hash of state
 * properties to update with new values or a function that given the current
 * state and props returns a new partial state
 * @param {() => void} [callback] A function to be called once component state is
 * updated
 */
Component.prototype.setState = function(update, callback) {
	// if (this.prevState==null) this.prevState = assign({}, this.state);
	// let s = this._nextState || this.state;
	// let s = this.state;
	// assign(this.state, update);

	// only clone state when copying to nextState the first time.
	let s = this._nextState || (this._nextState = assign({}, this.state));

	// if update() mutates state in-place, skip the copy:
	if (typeof update!=='function' || (update = update(s, this.props))) {
		assign(s, update);
	}

	// Skip update if updater function returned null
	if (update==null) return;

	// let s = this._nextState || this.state;
	// this._nextState = assign(assign({}, s), typeof update==='function' && update(s, this.props) || s);

	// console.log(update, this._nextState);
	// this._nextState = Object.assign({}, s, update);
	if (callback!=null) this._renderCallbacks.push(callback);

	this._force = false;
	enqueueRender(this);
	// if (!this._dirty && (this._dirty = true) && q.push(this)===1) (0, Component.debounce)(process);
};

/**
 * Immediately perform a synchronous re-render of the component
 * @param {() => void} [callback] A function to be called after component is
 * re-renderd
 */
Component.prototype.forceUpdate = function(callback) {
	if (this._parent!=null) {
		// Set render mode so that we can differantiate where the render request
		// is coming from. We need this because forceUpdate should never call
		// shouldComponentUpdate
		if (this._force==null) this._force = true;

		let mounts = [];
		diff(this._vnode._el, this._parent, this._vnode, this._vnode, this.context, this._parent.ownerSVGElement!==undefined, true, null, mounts, this._ancestorComponent, this._parentVNode);
		flushMounts(mounts);

		// Reset mode to its initial value for the next render
		this._force = null;
	}
	if (callback!=null) callback();
};

/**
 * Accepts `props` and `state`, and returns a new Virtual DOM tree to build.
 * Virtual DOM is generally constructed via [JSX](http://jasonformat.com/wtf-is-jsx).
 * @param {object} props Props (eg: JSX attributes) received from parent
 * element/component
 * @param {object} state The component's current state
 * @param {object} context Context object, as returned by the nearest
 * ancestor's `getChildContext()`
 * @returns {import('./index').ComponentChildren | void}
 */
Component.prototype.render = function () {};

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
let q = [];

// const defer = typeof Promise=='function' ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;
// Component.debounce = typeof Promise=='function' ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;

/**
 * Asynchronously schedule a callback
 * @type {(cb) => void}
 */
const defer = typeof Promise=='function' ? Promise.resolve().then.bind(Promise.resolve()) : setTimeout;
// Component.debounce = setTimeout;

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
export function enqueueRender(c) {
	// console.log('enqueueRender', c.id, q.length===0, c._dirty);
	if (!c._dirty && (c._dirty = true) && q.push(c) === 1) {
		// (0, Component.debounce)(process);
		(Component.debounce || defer)(process);
		// (Component.debounce || setTimeout)(process);
		// defer(process);
		// (Component.debounce || setTimeout)(process);
		// (0, Component.debounce || defer)(process);
	}

	// if (!c._dirty) {
	// 	c._dirty = true;
	// 	if (diffLevel!==0) {
	// 		q.push(c);
	// 	}
	// 	else {
	// 		diff(c.base, c.base.parentNode, c._vnode, c._vnode, c.context);
	// 	}
	// }

	// if (!c._dirty && (c._dirty = true) && q.push(c) === 1) {
	// 	requestAnimationFrame(process);
	// }
	// if (q.push(c) === 1) setTimeout(process);
}

/** Flush the render queue by rerendering all queued components */
function process() {
	// console.log('process queue', q.map(c => c.context.__depth)+' ');

	// requestIdleCallback( (c) => {
	// 	let p;
	// 	while (c.timeRemaining()>0 && (p=q.pop())) {
	// 		if (p._dirty) p.forceUpdate();
	// 	}
	// 	if (q.length) process();
	// });

	let p;
	while ((p=q.pop())) {
		if (p._dirty) p.forceUpdate();
	}

	// let time = Date.now(), len=q.length, i=len;
	// while (i--) {
	// 	if (Date.now() - time > 2) break;
	// 	if (q[i]._dirty) q[i].forceUpdate();
	// }
	// q.splice(i, len-i);
	// if (i>=0) (0, Component.debounce)(process);

	// while ( Date.now() - time < 5 && (p=q.pop())) {
	// 	if (p._dirty) p.forceUpdate();
	// }
	// if (q.length) (0, Component.debounce)(process);

	// let current = q;
	// q = [];
	// for (let i=current.length; i--; ) {
	// 	if (current[i]._dirty) {
	// 		current[i].forceUpdate();
	// 	}
	// }

	// let current = q, p;
	// q = [];
	// while ((p = current.pop())) {
	// 	if (p._dirty) {
	// 		p.forceUpdate();
	// 		// diff(p.base, p.base.parentNode, p._vnode, p._vnode, p.context);
	// 	}
	// }
}

// export { process as processQueue };
