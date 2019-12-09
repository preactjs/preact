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

	/*
	//还有以下内部属性
	//对应渲染的dom
	this.base
	//标记是forceUpdate,如果是这个渲染是不执行某些生命周期
	this._force
	//标记组件内部状态是否发生改变,渲染时设为true,渲染后设为false,防止队列中重复渲染
	this._dirty
	//保存setState和did生命周期的回调
	this._renderCallbacks
	//保存context,也就是createContext的context,与this.context的区别是this.context有可能是Provider的value
	this._context
	//setState后新的状态会保存在这儿,渲染时会设置给state
	this._nextState
	//对应的虚拟节点
	this._vnode
	//父的真实dom
	this._parentDom
	*/
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
	let s;
	//获取_nextState
	if (this._nextState !== this.state) {
		s = this._nextState;
	} else {
		//新拷贝一份
		s = this._nextState = assign({}, this.state);
	}
	//如果update为函数则执行这个函数
	if (typeof update == 'function') {
		update = update(s, this.props);
	}
	//合并update到_nextState
	if (update) {
		assign(s, update);
	}

	// Skip update if updater function returned null
	//如果update为null则不更新
	if (update == null) return;

	if (this._vnode) {
		//标记不是强制更新
		this._force = false;
		//有回调把回调加入回调数组里
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
//强制渲染
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
//获得虚拟节点对应index的子节点的真实dom
export function getDomSibling(vnode, childIndex) {
	if (childIndex == null) {
		// Use childIndex==null as a signal to resume the search from the vnode's sibling
		//使用虚拟节点的父节点继续查找
		return vnode._parent
			? getDomSibling(vnode._parent, vnode._parent._children.indexOf(vnode) + 1)
			: null;
	}

	let sibling;
	//遍历虚拟节点的子节点
	for (; childIndex < vnode._children.length; childIndex++) {
		sibling = vnode._children[childIndex];
		//如果该子节点的_dom不为null,则返回
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
	//没有找到并且虚拟节点类型为函数则调用getDomSibling(vnode),此时Index为null,执行此函数第一行代码      其它则返回null
	return typeof vnode.type === 'function' ? getDomSibling(vnode) : null;
}

/**
 * Trigger in-place re-rendering of a component.
 * @param {import('./internal').Component} component The component to rerender
 */
//渲染组件
function renderComponent(component) {
	let vnode = component._vnode,
		oldDom = vnode._dom,
		parentDom = component._parentDom;

	if (parentDom) {
		let commitQueue = [];
		//比对更新
		let newDom = diff(
			parentDom,
			vnode,
			assign({}, vnode),
			component._context,
			parentDom.ownerSVGElement !== undefined,
			null,
			commitQueue,
			oldDom == null ? getDomSibling(vnode) : oldDom
		);
		//渲染完成时执行did生命周期和setState回调
		commitRoot(commitQueue, vnode);
		//如果newDom与oldDom不一致,则调用updateParentDomPointers
		if (newDom != oldDom) {
			updateParentDomPointers(vnode);
		}
	}
}

/**
 * @param {import('./internal').VNode} vnode
 */
//更新组件类型的虚拟节点的祖先节点的_dom与_component.base
function updateParentDomPointers(vnode) {
	//取_parent如果不为空并且_component不为空
	if ((vnode = vnode._parent) != null && vnode._component != null) {
		vnode._dom = vnode._component.base = null;
		//遍历此节点的子节点
		for (let i = 0; i < vnode._children.length; i++) {
			let child = vnode._children[i];
			//如果此节点的子节点_dom为真,然后设置给此节点的_dom与_component.base
			if (child != null && child._dom != null) {
				vnode._dom = vnode._component.base = child._dom;
				break;
			}
		}
		//递归设置
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
 * @type {(cb: () => void) => void}
 */
/* istanbul ignore next */
// Note the following line isn't tree-shaken by rollup cuz of rollup/rollup#2566
//延迟,如defer(callback)，如果支持Promise则会用Promise then执行,否则用setTimeout执行
//见README.md解惑疑点1
const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */
//延迟执行的钩子
let prevDebounce;

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
//组件加入渲染队列并延迟渲染
export function enqueueRender(c) {
	//如果_dirty为false则设为true
	//然后把组件加入队列中
	//如果队列长度为1或者重新设置过debounceRendering钩子则延迟渲染
	if (
		(!c._dirty && (c._dirty = true) && q.push(c) === 1) ||
		prevDebounce !== options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		//延迟执行process
		(prevDebounce || defer)(process);
	}
}

/** Flush the render queue by rerendering all queued components */
//遍历队列渲染组件
function process() {
	let p;
	//按深度排序 最顶级的组件的最先执行
	q.sort((a, b) => b._vnode._depth - a._vnode._depth);
	while ((p = q.pop())) {
		// forceUpdate's callback argument is reused here to indicate a non-forced update.
		//如果组件需要渲染则渲染它
		if (p._dirty) renderComponent(p);
	}
}
