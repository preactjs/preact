# 解析preact源码,从preact中理解react原理

>注:目前是基于preact10.0.5版本做分析,每个文件的详细注释在[链接](https://github.com/yujingwyh/preact-source-annotation) ,觉得好的话麻烦点个star 
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
## 二.diff
这个是简单的demo,渲染App组件到真实dom中
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
项目打包环节中,babel的transform-react-jsx插件会将jsx语法编译成React.createElement(type, props, children)形式,对应的是(元素类型,元素属性,元素子节点).preact中需要设置此插件参数,使React.createElement对应为h,最终编译结果如下
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
2. **虚拟节点diff**<br />
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
```
执行render函数时,调用了diff函数
## 三.组件
###1.component
###2.context
defaultValue
value
ctx
## 四.解惑疑点
1. defer
```jsx harmony
//src/component.js
const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;
```
用意大家基本都懂,如果支持Promise,用Promise处理.不然的话用setTimeout处理,但是`Promise.prototype.then.bind(Promise.resolve())`他最终到底是啥东西,我是想了很长一段时间,我们知道`Promise.prototype.then`会从this中获取Promise的实例,而后面的这段代码`...then.bind(Promise.resolve())`,其中bind会改变this的指向,在这儿将是`Promise.resolve()`的返回结果,所以等于`Promise.resolve().then`<br />
2. vnode用Fragment包装
```jsx harmony
//src/render.js
function render(vnode, parentDom, replaceNode) {
	//...
	vnode = createElement(Fragment, null, [vnode]);
	//...
}
```
发现render函数中会用Fragment嵌套实际传进来的组件,如果不嵌套会怎么样呢,例如执行这个代码`render(<div>123</div>,document.getElementBuId('App'))`,当执行到diff函数时,会直接调用`newVNode._dom = diffElementNodes(oldVNode._dom,newVNode,oldVNode,)`,这样最终生成的dom不会添加到parentDom里面中去,而如果用Fragment嵌套下,在diff中判断是组件类型,于是执行`diffChildren(parentDom,newVNode,oldVNode...)`,这样会在diffChildren中把生成的dom添加到parentDom中<br />
3. hydrate渲染
```jsx harmony
//src/render.js
function hydrate(vnode, parentDom) {
	render(vnode, parentDom, IS_HYDRATE);
}

```
用hydrate与render两个渲染有什么区别呢,从代码中我们发现在hydrate模式中,diffProps只处理了事件部分,对其他的props没有处理.所以hydrate常用于在服务器渲染后端的html,在客户端渲染时会用hydrate去渲染,由于props在服务端渲染的时候已经处理了,这儿渲染的时候就不用处理了,从而加快首次渲染性能<br />
4. props中value与checked单独处理  
```jsx harmony
//src/diff/props.js
function diffProps(dom, newProps, oldProps, isSvg, hydrate) {
	let i;
	//...
	for (i in newProps) {
		if (
			(!hydrate || typeof newProps[i] == 'function') &&
			i !== 'value' &&
			i !== 'checked' &&
			oldProps[i] !== newProps[i]
		) {
			setProperty(dom, i, newProps[i], oldProps[i], isSvg);
		}
	}
}
//src/diff/index.js
function diffElementNodes(dom,newVNode,oldVNode,) {
	//...
	diffProps(dom, newProps, oldProps, isSvg, isHydrating);
	//...
	diffChildren(dom,newVNode,oldVNode/*...*/);
	//...
	if (
		'value' in newProps &&
		newProps.value !== undefined &&
		newProps.value !== dom.value
	) {
		dom.value = newProps.value == null ? '' : newProps.value;
	}
	if (
		'checked' in newProps &&
		newProps.checked !== undefined &&
		newProps.checked !== dom.checked
	) {
		dom.checked = newProps.checked;
	}
	//...
}
``` 
在diffProps并没有对value与checked,而是在`diffChildren()`后对value与checked做了处理,在diffChildren中算是找到了原因
```jsx harmony
//src/diff/children.js
function diffChildren(parentDom,newParentVNode,oldParentVNode,){
    //...
	if (newParentVNode.type == 'option') {
		parentDom.value = '';
	}
    //...
}
```
为什么要设置value为空呢,原来option不设置value,他会把元素的文本内容来作为value,当然还有一些元素也是同样的,不设置value,会从子元素中获取,所以在mvvm中会有问题的,这样谈不上数据与dom双向绑定,所以要在子元素渲染完成,设置value为空,而value的具体数据在子元素处理完成才处理<br />
5. 已经setState又去渲染组件
```jsx harmony
//src/diff/catch-error.js
function _catchError(error, vnode) {
	//...
	if (
		component.constructor &&
		component.constructor.getDerivedStateFromError != null
	) {
		component.setState(
			component.constructor.getDerivedStateFromError(error)
		);
		//如果设置了componentDidCatch，则执行componentDidCatch
	}
    //...
	return enqueueRender((component._pendingError = component));
    //...
}
```
当子组件有异常后,他会不断的寻找他的祖先组件,直到祖先组件设置了getDerivedStateFromError或者componentDidCatch,然后有这个组件处理异常,不然直到最顶级组件都没有处理异常,则会抛出异常.如果设置了`getDerivedStateFromError`,`component.setState`这儿已经用setState来更新组件了,而后面还去`enqueueRender(component)`渲染了组件,有必要吗,其实是有必要的,这儿主要是为了如果setState后没有对异常做处理,那么`enqueueRender`渲染后会再循环并跳过这个组件,在向上寻找<br />
6. 标记组件 处理异常中 用了两个变量
```jsx harmony
//src/diff/catch-error.js
function _catchError(error, vnode) {
    //...
	if ((component = vnode._component) && !component._processingException) {
		//...
		return enqueueRender((component._pendingError = component));
	}
    //...
}
//src/diff/index.js
function diff(parentDom,newVNode,oldVNode){
	//...
	clearProcessingException = c._processingException = c._pendingError;
    //...
}
``` 
 `catchError`中用 `_processingException`来判断这个组件是否处理异常,而在`component._pendingError = component`却设置了_pendingError来标记这个组件是处理异常中,在`diff`中又赋给了`_processingException`,为什么不用一个变量来标记呢,其实主要原因是如果渲染队列中前面有他的子组件需要渲染,如果子组件渲染出错,这时不应该跳过这个组件,只有在渲染这个组件的时候才去标记这个组件正在处理异常<br />
7. diffProps中事件的处理
```jsx harmony
//src/diff/props.js
function setProperty(dom, name, value, oldValue, isSvg) {
	if (value) {
		if (!oldValue) dom.addEventListener(name, eventProxy, useCapture);
		(dom._listeners || (dom._listeners = {}))[name] = value;
	} else {
		dom.removeEventListener(name, eventProxy, useCapture);
	}
}
function eventProxy(e) {
	//如果存在options.event则先执行钩子
	this._listeners[e.type](options.event ? options.event(e) : e);
}
```
这儿对props的比较处理有点意思,在设置了props的事件时,例如`<input onChange={e=>console.log(e.target.value)} />`,如果onChange之前是空,那么会执行`dom.addEventListener(name, eventProxy, useCapture)`来给dom添加一个事件处理函数,而这个处理函数是一个固定的函数`eventProxy`,当后面onChange中的监听函数发生变化时,只要修改下dom._listeners对应的监听函数,当触发事件时,只要执行固定的dom._listeners中保存的对应监听函数,只有onChange设置了空才去移除这个监听,当onChange中的监听函数发生变化时就不用移除之前的监听,然后监听新的函数<br />
8. _lastDomChild的用处
```jsx harmony
//src/diff/children.js
function diffChildren( parentDom, newParentVNode, oldParentVNode){
    //...
	if (childVNode._lastDomChild != null) {
		newDom = childVNode._lastDomChild;
		childVNode._lastDomChild = null;
	} else if (
		excessDomChildren == oldVNode ||
		newDom != oldDom ||
		newDom.parentNode == null
	) {
		//...
		//这儿将	parentDom与子节点dom做了关联	
		parentDom.appendChild(newDom);
		//...		
	}
    //...
    if (typeof newParentVNode.type == 'function') {
        // At this point, if childVNode._lastDomChild existed, then
        // newDom = childVNode._lastDomChild per line 101. Else it is
        // the same as childVNode._dom, meaning this component returned
        // only a single DOM node
        newParentVNode._lastDomChild = newDom;
    }
    //...
}
```
用_lastDomChild的意义何在呢,当子节点渲染完成,他就会与父节点做关联,例如`<div>123</div>`,当文本节点123创建完成,就需要添加到div元素中,这是没有问题的,但是如果是父节点是一个函数类型的节点,这时就没有必要去关联了
```jsx harmony
function App() {
	return <div>123</div>;
}
render(<App/>,document.getElementById('app'));
```
上面代码中一共会有三个虚拟节点App,div,123,在diffChildren App的虚拟节点时,newDom为div节点,这时不会执行 `parentDom.appendChild(newDom)`,app节点与div节点的关联是在diffChildren div中已经处理了,所有diffChildren App虚拟节点不用处理父子节点的关联,这个还是比较难理解的,建议多看看源码<br />
9. excessDomChildren又去设置了null
```jsx harmony
//src/diff/index.js
function diffElementNodes(dom,newVNode,oldVNode,){
	//判断能否复用excessDomChildren中的dom
	if (dom == null && excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			const child = excessDomChildren[i];
			//如果虚拟节点类型为null而存在节点类型是text或者虚拟节点类型和存在节点类型相同，则复用
			if (
				child != null &&
				(newVNode.type === null
					? child.nodeType === 3
					: child.localName === newVNode.type)
			) {
				dom = child;
				//设置对应的存在节点为空
				excessDomChildren[i] = null;
				break;
			}
		}
	}
    //...
	if (newVNode.type === null) {
		//如果diffElementNodes传进来dom就不为空,则将excessDomChildren对应的节点设为null
		//见README.md解惑疑点9
		if (excessDomChildren != null) {
			excessDomChildren[excessDomChildren.indexOf(dom)] = null;
		}
		//如果两者不相等,则设置data来更新TextNode的文本
		if (oldProps !== newProps) {
			dom.data = newProps;
		}
	}
}
```
这儿我一直觉得没必要再去`excessDomChildren[excessDomChildren.indexOf(dom)] = null`,因为前面已经设置为null,我认为是作者忘记改了,后来翻了翻github,终于理解作者的用意
```jsx harmony
render(<p>2</p>, document.getElementById('app'));
render(
	<p>3</p>,
	document.getElementById('app'),
	document.getElementById('app').firstChild
);
```
如果这这样处理,那么上面的代码会渲染为空,我们分析下,第一次render时是正常的,在执行第二个render时,此时replaceNode为document.getElementById('app').firstChild,也就是p节点,这次渲染后为什么会为空呢?在`diffElementNodes`文本节点3时,这时dom不为空,所以不会执行`excessDomChildren[i] = null`,但这儿还会复用之前的text为2的节点,只不过将内容设置成了3,后面如果不将`excessDomChildren`中之前的文本节点设为空,那么当执行diffChildren p元素时,会移除这个以前的text节点,所以什么就会渲染空
```jsx harmony
function diffChildren(parentDom, newParentVNode, oldParentVNode,) {
	if (excessDomChildren != null && typeof newParentVNode.type !== 'function') {
		for (i = excessDomChildren.length; i--;) {
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
		}
	}
}
```
