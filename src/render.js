import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
import options from './options';

const IS_HYDRATE = EMPTY_OBJ;

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 * @param {Element | Text} [replaceNode] Attempt to re-use an
 * existing DOM tree rooted at `replaceNode`
 */
export function render(vnode, parentDom, replaceNode) {
	//root钩子
	if (options._root) options._root(vnode, parentDom);
	//是否hydration模式
	let isHydrating = replaceNode === IS_HYDRATE;
	let oldVNode = isHydrating
		? null
		: (replaceNode && replaceNode._children) || parentDom._children;
	//用Fragment包装下
	vnode = createElement(Fragment, null, [vnode]);
	//未卸载的组件列表
	let commitQueue = [];
	diff(
		parentDom,
		((isHydrating ? parentDom : replaceNode || parentDom)._children = vnode),
		oldVNode || EMPTY_OBJ,
		EMPTY_OBJ,
		parentDom.ownerSVGElement !== undefined,
		replaceNode && !isHydrating
			? [replaceNode]
			: oldVNode
			? null
			: EMPTY_ARR.slice.call(parentDom.childNodes),
		commitQueue,
		replaceNode || EMPTY_OBJ,
		isHydrating
	);
	//渲染完成时执行did生命周期和setState回调
	commitRoot(commitQueue, vnode);
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
//hydration模式渲染
//此模式中,props的处理只处理事件部分,其它都不处理
//主要用于在服务器渲染的节点去调用hydrate
export function hydrate(vnode, parentDom) {
	render(vnode, parentDom, IS_HYDRATE);
}
