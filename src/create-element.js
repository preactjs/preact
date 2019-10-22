import options from './options';
import { assign } from './util';

/**
  * Create an virtual node (used for JSX)
  * @param {import('./internal').VNode["type"]} type The node name or Component
  * constructor for this virtual node
  * @param {object | null | undefined} [props] The properties of the virtual node
  * @param {Array<import('.').ComponentChildren>} [children] The children of the virtual node
  * @returns {import('./internal').VNode}
  */
//创建元素
export function createElement(type, props, children) {
	//拷贝props
	props = assign({}, props);
	//对参数处理，如果有多个children是数组，单个不是
	if (arguments.length>3) {
		children = [children];
		// https://github.com/preactjs/preact/issues/1916
		for (let i=3; i<arguments.length; i++) {
			children.push(arguments[i]);
		}
	}
	//赋值给props.children
	if (children!=null) {
		props.children = children;
	}

	// "type" may be undefined during development. The check is needed so that
	// we can display a nice error message with our debug helpers
	//对defaultProps做处理，合并到props上
	if (type!=null && type.defaultProps!=null) {
		for (let i in type.defaultProps) {
			if (props[i]===undefined) props[i] = type.defaultProps[i];
		}
	}
	let ref = props.ref;
	let key = props.key;
	if (ref!=null) delete props.ref;
	if (key!=null) delete props.key;
	//调用创建节点
	return createVNode(type, props, key, ref);
}

/**
 * Create a VNode (used internally by Preact)
 * @param {import('./internal').VNode["type"]} type The node name or Component
 * Constructor for this virtual node
 * @param {object | string | number | null} props The properties of this virtual node.
 * If this virtual node represents a text node, this is the text of the node (string or number).
 * @param {string | number | null} key The key for this virtual node, used when
 * diffing it against its children
 * @param {import('./internal').VNode["ref"]} ref The ref property that will
 * receive a reference to its created child
 * @returns {import('./internal').VNode}
 */
//创建虚拟节点
//type为null时，props参数就是对应的children {type:null,props:123,..}这个是合法的
export function createVNode(type, props, key, ref) {
	// V8 seems to be better at detecting type shapes if the object is allocated from the same call site
	// Do not inline into createElement and coerceToVNode!
	const vnode = {
		type,
		props,
		key,
		ref,
		//子的虚拟节点
		_children: null,
		//父的虚拟节点
		_parent: null,
		//渲染深度
		_depth: 0,
		//该虚拟节点渲染的dom
		_dom: null,
		_lastDomChild: null,
		//类或函数组件的实例化
		_component: null,
		//标识是vnode
		constructor: undefined
	};
	//钩子
	if (options.vnode) options.vnode(vnode);

	return vnode;
}

//创建ref，这个ref不同react，创建时没有current
export function createRef() {
	return {};
}
//片段
export function Fragment(props) {
	return props.children;
}

/**
 * Check if a the argument is a valid Preact VNode.
 * @param {*} vnode
 * @returns {vnode is import('./internal').VNode}
 */
//判断是否是createElement的元素，createElement创建后constructor为undefined
export const isValidElement = vnode => vnode!=null && vnode.constructor === undefined;

/**
 * Coerce an untrusted value into a VNode
 * Specifically, this should be used anywhere a user could provide a boolean, string, or number where
 * a VNode or Component is desired instead
 * @param {boolean | string | number | import('./internal').VNode} possibleVNode A possible VNode
 * @returns {import('./internal').VNode | null}
 */
//强制转虚拟节点
export function coerceToVNode(possibleVNode) {
	//null和布尔 直接返回null
	if (possibleVNode == null || typeof possibleVNode === 'boolean') return null;
	//如果是字符串或者数字，props直接为对应的字符串或数字，这样是合法的
	if (typeof possibleVNode === 'string' || typeof possibleVNode === 'number') {
		return createVNode(null, possibleVNode, null, null);
	}

	// Clone vnode if it has already been used. ceviche/#57
	//如果是已经渲染的虚拟节点，则返回克隆的虚拟节点
	if (possibleVNode._dom!=null || possibleVNode._component!=null) {
		let vnode = createVNode(possibleVNode.type, possibleVNode.props, possibleVNode.key, null);
		vnode._dom = possibleVNode._dom;
		return vnode;
	}
	//其它直接返回
	return possibleVNode;
}
