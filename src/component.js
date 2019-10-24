import { assign } from './util';
import { diff, commitRoot } from './diff/index';
import options from './options';
import { Fragment } from './create-element';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
//类组件
export function Component(props, context) {
	this.props = props;
	this.context = context;
}

/**
 * Update component state and schedule a re-render.
 * @param {object | ((s: object, p: object) => object)} update A hash of state
 * properties to update with new values or a function that given the current
 * state and props returns a new partial state
 * @param {() => void} [callback] A function to be called once component state is
 * updated
 */
//设置状态
Component.prototype.setState = function(update, callback) {
	// only clone state when copying to nextState the first time.
	//如果nextState等于state，则为nextState，其它扩展this.state到this._nextState
	let s = (this._nextState!==this.state && this._nextState) || (this._nextState = assign({}, this.state));

	// if update() mutates state in-place, skip the copy:
	//如果update不是函数则将update扩展到nextState，是函数执行函数然后扩展
	if (typeof update!=='function' || (update = update(s, this.props))) {
		assign(s, update);
	}

	// Skip update if updater function returned null
	//如果update为null则不更新
	if (update==null) return;

	if (this._vnode) {
		//标记不是强制更新
		this._force = false;
		//有回调吧回调加入回调数组里
		if (callback) this._renderCallbacks.push(callback);
		//加入渲染队列并渲染
		enqueueRender(this);
	}
};

/**
 * Immediately perform a synchronous re-render of the component
 * @param {() => void} [callback] A function to be called after component is
 * re-rendered
 */
//强制更新
Component.prototype.forceUpdate = function(callback) {
	if (this._vnode) {
		// Set render mode so that we can differentiate where the render request
		// is coming from. We need this because forceUpdate should never call
		// shouldComponentUpdate
        //标记强制更新
        this._force = true;
        //有回调加入回调数组里
		if (callback) this._renderCallbacks.push(callback);
        //加入渲染队列并渲染
		enqueueRender(this);
	}
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
//设置render
Component.prototype.render = Fragment;

/**
 * @param {import('./internal').VNode} vnode
 * @param {number | null} [childIndex]
 */
export function getDomSibling(vnode, childIndex) {
	if (childIndex == null) {
		// Use childIndex==null as a signal to resume the search from the vnode's sibling
		return vnode._parent
			? getDomSibling(vnode._parent, vnode._parent._children.indexOf(vnode) + 1)
			: null;
	}

	let sibling;
	for (; childIndex < vnode._children.length; childIndex++) {
		sibling = vnode._children[childIndex];

		if (sibling != null && sibling._dom != null) {
			// Since updateParentDomPointers keeps _dom pointer correct,
			// we can rely on _dom to tell us if this subtree contains a
			// rendered DOM node, and what the first rendered DOM node is
			return sibling._dom;
		}
	}

	// If we get here, we have not found a DOM node in this vnode's children.
	// We must resume from this vnode's sibling (in it's parent _children array)
	// Only climb up and search the parent if we aren't searching through a DOM
	// VNode (meaning we reached the DOM parent of the original vnode that began
	// the search)
	return typeof vnode.type === 'function' ? getDomSibling(vnode) : null;
}

/**
 * Trigger in-place re-rendering of a component.
 * @param {import('./internal').Component} component The component to rerender
 */
function renderComponent(component) {
	let vnode = component._vnode,
		oldDom = vnode._dom,
		parentDom = component._parentDom;

	if (parentDom) {
		let commitQueue = [];
		let newDom = diff(parentDom, vnode, assign({}, vnode), component._context, parentDom.ownerSVGElement!==undefined, null, commitQueue, oldDom == null ? getDomSibling(vnode) : oldDom);
		commitRoot(commitQueue, vnode);

		if (newDom != oldDom) {
			updateParentDomPointers(vnode);
		}
	}
}

/**
 * @param {import('./internal').VNode} vnode
 */
function updateParentDomPointers(vnode) {
	if ((vnode = vnode._parent) != null && vnode._component != null) {
		vnode._dom = vnode._component.base = null;
		for (let i = 0; i < vnode._children.length; i++) {
			let child = vnode._children[i];
			if (child != null && child._dom != null) {
				vnode._dom = vnode._component.base = child._dom;
				break;
			}
		}

		return updateParentDomPointers(vnode);
	}
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
//渲染队列
let q = [];

/**
 * Asynchronously schedule a callback
 * @type {(cb) => void}
 */
//延迟   如 defer(callback)，callback会用Promise then或者 setTimeout执行
//Promise.prototype.then.bind(Promise.resolve()) 等同于 Promise.resolve().then
const defer = typeof Promise=='function' ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout;

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */
//延迟执行的钩子
let prevDebounce = options.debounceRendering;

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
//组件加入渲染队列并延迟渲染
export function enqueueRender(c) {
	//如果_dirty为false则设为true
	//然后吧组件加入队列中
	//如果队列长度为1或者重新设置过debounceRendering钩子
	if ((!c._dirty && (c._dirty = true) && q.push(c) === 1) ||
	    (prevDebounce !== options.debounceRendering)) {
		prevDebounce = options.debounceRendering;
		//延迟执行process
		(options.debounceRendering || defer)(process);
	}
}

/** Flush the render queue by rerendering all queued components */
//遍历队列渲染组件
function process() {
	let p;
	//按深度排序 最外层的最先执行
	q.sort((a, b) => b._vnode._depth - a._vnode._depth);
	while ((p=q.pop())) {
		// forceUpdate's callback argument is reused here to indicate a non-forced update.
		//如果组件需要渲染则渲染它
		if (p._dirty) renderComponent(p);
	}
}
