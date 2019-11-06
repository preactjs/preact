import { assign } from './util';
import { EMPTY_ARR } from './constants';
import { createVNode } from './create-element';

/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {import('./internal').VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {Array<import('./index').ComponentChildren>} rest Any additional arguments will be used as replacement children.
 */
/*
克隆元素
cloneElement(
  element,
  [props],
  [...children]
)
等同于
<element.type {...element.props} {...props}>{children}</element.type>
但cloneElement 会保留了组件的 ref
*/
export function cloneElement(vnode,props) {
	//拷贝props
	props = assign(assign({}, vnode.props), props);
	//children处理
	if (arguments.length > 2) props.children = EMPTY_ARR.slice.call(arguments, 2);
	//调用创建虚拟节点
	return createVNode(
		vnode.type,
		props,
		props.key || vnode.key,
		props.ref || vnode.ref
	);
}
