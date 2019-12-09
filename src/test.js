//src/render.js
import { diffChildren, toChildArray } from 'preact/src/diff/children';
import { diffProps } from 'preact/src/diff/props';

/**
 * 渲染虚拟节点到真实节点
 * @param vnode 虚拟节点
 * @param parentDom 真实dom节点
 */
function render(vnode, parentDom) {
	diff(parentDom, vnode);
}

//src/diff/index.js
function diff(parentDom, newVNode) {
	let tmp,
		newType = newVNode.type;

	if (typeof newType === 'function') {
		let c,
			newProps = newVNode.props;
		newVNode._component = c = new newType(newProps);
		//执行render
		tmp = c.render(c.props, c.state);
		newVNode._children = toChildArray(tmp);
		//对比子节点
		diffChildren(parentDom, newVNode);
	} else {
		newVNode._dom = diffElementNodes(newVNode);
	}
	return newVNode._dom;
}

function diffElementNodes(dom, newVNode) {
	//text节点
	if (newVNode.type === null) {
		return document.createTextNode(newProps);
	}
	//创建元素
	dom = document.createElement(newVNode.type);
	//对比元素的属性
	diffProps(dom, newProps, oldProps);
	//设置_children
	newVNode._children = newVNode.props.children;
	diffChildren(dom, newVNode);

	return dom;
}

//src/diff/children.js
function diffChildren(parentDom, newParentVNode) {
	newParentVNode._children = toChildArray(
		newParentVNode._children,
		childVNode => {
			newDom = diff(parentDom, childVNode, oldVNode);
			//如果newDom
			if (newDom != null) {
				if (oldDom == null || oldDom.parentNode !== parentDom) {
					parentDom.appendChild(newDom);
				} else {
					//添加到oldDom前面
					parentDom.insertBefore(newDom, oldDom);
				}
			}
		}
	);
}
