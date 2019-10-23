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

	let isHydrating = replaceNode === IS_HYDRATE;
	let oldVNode = isHydrating ? null : replaceNode && replaceNode._children || parentDom._children;
	//用Fragment包装下
	vnode = createElement(Fragment, null, [vnode]);
	//未卸载的组件列表
	let mounts = [];
	diff(
		parentDom,
		isHydrating ? parentDom._children = vnode : (replaceNode || parentDom)._children = vnode,
		oldVNode || EMPTY_OBJ,
		EMPTY_OBJ,
		parentDom.ownerSVGElement !== undefined,
		replaceNode && !isHydrating
			? [replaceNode]
			: oldVNode
				? null
				: EMPTY_ARR.slice.call(parentDom.childNodes),
		mounts,
		replaceNode || EMPTY_OBJ,
		isHydrating,
	);
	//执行componentDidMount生命周期
	commitRoot(mounts, vnode);

	console.log(vnode)
}

/**
 * Update an existing DOM element with data from a Preact virtual node
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * update
 */
//注水。。。   todo 这种会复用parentDom中的元素
//比如服务端渲染完成是绑定事件
export function hydrate(vnode, parentDom) {
	render(vnode, parentDom, IS_HYDRATE);
}
