# 深度解析preact源码,从preact中理解react原理

>注:每个文件的注释在[链接](https://github.com/yujingwyh/preact-source-annotation) ,觉得好的话麻烦点个star 
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
```jsx
import { Component,render, h } from '../src';
/**
* react中应该是这样
* import React,{Component} from 'react'
* import {render} from 'react-dom'
*/

class App extends Component{
 render(){
   return <div id="app">123</div>
 }
}
function Root(){
 return <App />
}

render(<Root />,document.getElementById('root'));
```
这个是简单的dome,我们看下流程
1. jsx语法装换
transform-react-jsx插件会将jsx语法转换为普通的js代码,转换后如上
```jsx
class App extends Component{
 render(){
   return h(
            'div',
            { id: 'app' },
            '123'
          )
 }
}
function Root(){
 return h(
   App,
   null
    )
}
```

```typescript
type ElementType =  null |string| ComponentType;
type ElementProps =  null | string | Attributes;
type ElementChildren =  null |string | VNode;

interface createElement {
  ( type:ElementType, props:ElementProps ,...children: ElementChildren[]  	): VNode
}
```
**h** 对应的是preact.createElement,其定义大体如上,对应的参数描述如下
* ElementType 元素类型,
1. 如果是文本数字等简单元素,则为null,
2. 如果是html标签的节点,则是html标签字符串,如`div`
3. 如果是函数型的节点,则是这个函数,如`App`
判断是函数节点或者html标签主要依据是是否首字母大写,如果是大写,他就是函数型节点,如果是小写,他就是普通的html节点,这就是为什么函数组件首字母要求大写的原因
* ElementProps 元素属性

* ElementChildren 元素子节点


2. 创建虚拟节点
3. 虚拟节点生成真实节点


## 三.重点深剖
###1.component
###2.diff
###3.context
defaultValue
value
##四.解惑疑点
lastchild 
props中value 单独处理    
{type:null,props:123,..}
createElement children有多个children是数组，单个不是
defer
_catchError _processingException enqueueRender
diffProps _listeners
