# 解析preact源码,从preact中理解react原理

>注:每个文件的详细注释在[链接](https://github.com/yujingwyh/preact-source-annotation) ,觉得好的话麻烦点个star 
#### 序言
一直想去研究react源码,看到一半然后不了了之了.主要是由于react项目过于庞大,代码也比较颗粒化,执行流转比较复杂.另外也没有过多的精力,所有没有持续下去.关注preact有很长一段时间了,有天想想为什么不研究研究preact源码呢,这个号称只有3KB的react浓缩版.<br />
看了下市面上也有很多preact源码解析,但我感觉都有一些不足,很多都是老版本,preact 8与10版本在代码结构上还是有很大差别的.另外大部分都是分析主要渲染的流程,而没有对于一些关键点去做作分析,例如为什么有_lastDomChild,为什么value没有在diffProps中处理,这才是代码中的复杂点,重中之重,也是学习源码的收益点,推测作者的用意,还有没有更好的办法,不是提示思维的最佳方式吗?
## 一.文件接口结构
路径 | 描述
---|---
/diff/catch-error.js  | 处理组件异常情况
/diff/children.js | 对比虚拟节点的子节点
/diff/index.js | 对比虚拟节点
/diff/props |  对比虚拟节点的props
clone-element.js | 克隆虚拟节点
component.js | 组件相关
constants.js | 一些常量
create-context.js | 创建context
create-element.js | 创建虚拟节点
index.js | 入口文件
options.js | 保存一些设置
render.js | 渲染虚拟节点到真实节点
util.js | 一些单元方法
## 二.渲染原理
```jsx harmony
import {h, Component, render,} from 'preact';

/**
 * react中应该是这样,其中h对应的是React.createElement
 * import React,{Component} from 'react'
 * import {render} from 'react-dom'
 */

class App extends Component {
	render() {
		return <div id="wrap">
			<span>123</span>
			456
		</div>
	}
}

render(<App/>, document.getElementById('app'));
```
这个是简单的demo,我们看下渲染流程
1. **创建虚拟节点**<br />
babel中transform-react-jsx插件会将jsx语法编译成对应的React.createElement(type, props, children)形式,对应的是(元素类型,元素属性,元素子节点).在preact中需要设置此插件参数,使React.createElement对应为h,最终编译结果如下
```jsx harmony
class App extends Component {
	render() {
		return h(
			"div",
			{id: "wrap"},
			h("span", null, "123"),
			"456"
		)
	}
}

render(
	h(
		App,
		null
	),
	document.getElementById('app')
);
```
**h** 函数对应的是preact.createElement函数.当执行render函数时,先执行createElement函数,里面又调用了createVNode函数,最终执行结果返回一个虚拟节点对象`{type:App,props:null,key:null,ref:null}`
```jsx harmony
//src/create-element.js
/**
 * 创建元素
 * @param type {null |string| ComponentType} type 元素类型
 * 如果是文本数字等简单元素,则为null,
 * 如果是html标签的节点,则是html标签字符串,如`div`
 * 如果是函数型的节点,则是这个函数,如`App`判断是函数节点或者html标签主要依据是是否首字母大写,如果是大写,他就是函数型节点,如果是小写,他就是普通的html节点,这就是为什么函数组件首字母要求大写的原因
 * 
 * @param props {string | Attributes} 元素属性
 * @param children {string | VNode} 元素子节点
 * @returns {VNode}
 */
function createElement(type, props, children) {
	let normalizedProps = {},
		i;
	//选择性拷贝props
	for (i in props) {
		if (i !== 'key' && i !== 'ref') normalizedProps[i] = props[i];
	}
	//对参数处理，如果有多个children是数组，单个不是
	if (arguments.length > 3) {
		children = [children];
		// https://github.com/preactjs/preact/issues/1916
		for (i = 3; i < arguments.length; i++) {
			children.push(arguments[i]);
		}
	}
	//赋值给props.children
	if (children != null) {
		normalizedProps.children = children;
	}

	//对defaultProps做处理，合并到props上
	if (typeof type === 'function' && type.defaultProps != null) {
		for (i in type.defaultProps) {
			if (normalizedProps[i] === undefined) {
				normalizedProps[i] = type.defaultProps[i];
			}
		}
	}
	//调用创建虚拟节点
	return createVNode(
		type,
		normalizedProps,
		props && props.key,
		props && props.ref
	);
}
//创建虚拟节点
function createVNode(type, props, key, ref) {
	const vnode = {
		type,
		props,
		key,
		ref,
        //...
	};

	return vnode;
}
```
2. **渲染虚拟节点,生成真实dom**
来看下render函数,调用了diff函数
```jsx harmony
//render.js
/**
 * 渲染虚拟节点到真实节点
 * @param vnode 虚拟节点
 * @param parentDom 真实dom节点
 * @param replaceNode
 */
function render(vnode, parentDom, replaceNode) {
    //...
	diff(
		parentDom,
		vnode,
		oldVNode,
        //...
	);
    //...
}
```

## 三.重点深剖
###1.component
###2.diff
###3.context
defaultValue
value
##四.解惑疑点
render 片段包装
lastchild 
props中value 单独处理    
{type:null,props:123,..}
createElement children有多个children是数组，单个不是
defer
_catchError _processingException enqueueRender
diffProps _listeners
