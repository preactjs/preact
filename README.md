# 解析preact源码,从preact中理解react原理

>注:每个文件的详细注释在[链接](https://github.com/yujingwyh/preact-source-annotation) ,觉得好的话麻烦点个star 
#### 序言
一直想去研究react源码,看到一半然后不了了之了.主要是由于react项目过于庞大,代码也比较颗粒化,执行流转比较复杂.另外也没有过多的精力,所有没有持续下去.关注preact有很长一段时间了,有天想想为什么不研究研究preact源码呢,这个号称只有3KB的react浓缩版.<br />
看了下市面上也有很多preact源码解析,但我感觉都有一些不足,很多都是老版本,preact 8与10版本在代码结构上还是有很大差别的.另外大部分都是分析主要渲染的流程,而没有对于一些关键点去做作分析,例如为什么有_lastDomChild,为什么value没有在diffProps中处理,这才是代码中的复杂点,重中之重,也是学习源码的收益点,推测作者的用意,还有没有更好的办法,不是提示思维的最佳方式吗?
## 一.文件结构
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
这个是简单的demo,渲染App组件到dom中
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
我们看下渲染流程
1. **创建虚拟节点**<br />
打包环节中,babel的transform-react-jsx插件会将jsx语法编译成React.createElement(type, props, children)形式,对应的是(元素类型,元素属性,元素子节点).preact中需要设置此插件参数,使React.createElement对应为h,最终编译结果如下
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
当执行render函数时,先执行**h**函数, h 函数是preact.createElement函数的别名.其中defaultProps就是在这个函数里处理的,最后又调用了createVNode函数,而createVNode返回了一个虚拟节点对象,所以`h(App,null)`的最终执行结果是`{type:App,props:null,key:null,ref:null}`
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
2. **渲染到真实dom**<br />
当执行完`h(App,null)`后,render会拿执行结果`{type:App,props:null,key:null,ref:null}`去渲染到真实dom
```jsx harmony
//src/render.js
/**
 * 渲染虚拟节点到真实节点
 * @param vnode 虚拟节点
 * @param parentDom 真实dom节点
 */
function render(vnode, parentDom) {
    diff(
		parentDom,
		vnode
    )
}
//src/diff/index.js
function diff(parentDom,newVNode){
	let tmp,newType = newVNode.type;
    if (typeof newType === 'function') {
    
}
else{
newVNode._dom = diffElementNodes(
				oldVNode._dom,
				newVNode)
}
return newVNode._dom;
}
```
执行render函数时,调用了diff函数
## 三.重点深剖
###1.component
###2.diff
###3.context
defaultValue
value
##四.解惑疑点
1. defer
```jsx harmony
//src/component.js
const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;
```
最开始这个意思我是懂,如果支持Promise,用Promise处理.不然的话用setTimeout处理,但是`Promise.prototype.then.bind(Promise.resolve())`我是想了很长一段时间,他最终到底是啥东西,其实这个东西等同于`Promise.resolve().then`,Promise.prototype.then会从this中获取一个Promise的实例,这儿`...then.bind(Promise.resolve())`,我们知道bind会改变this的指向,在这儿是`Promise.resolve()`的返回结果,所以就是`Promise.resolve().then`

render 片段包装
lastchild 
props中value 单独处理    
defer
_catchError _processingException enqueueRender
diffProps _listeners
