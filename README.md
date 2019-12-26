# preact源码解析，从preact中理解react原理

>注:目前是基于preact10.1.0版本做分析。每个文件的详细注释在[链接](https://github.com/yujingwyh/preact-source-annotation/tree/master/src)，觉得好的话麻烦点个star 
#### 序言
一直想去研究react源码，但每次看到一半都然后不了了之了。主要原因是react项目过于庞大，代码比较颗粒化，执行流转复杂，这就需要过多的精力去研究，所有没有持续下去。<br />
关注preact有很长一段时间了，有天想想为什么不研究研究preact源码呢，这个号称只有3KB的react浓缩版。看了下市面上也有很多对preact源码解析，但我感觉都有一些不足。首先很多都是老版本，preact中8与10版本在代码结构上还是有很大差别。其次大部分都是分析主要渲染的流程，而没有对于一些关键点去做作分析。例如为什么有_lastDomChild？为什么value没有在diffProps中处理？这才是分析代码中的复杂点，重中之重，也是解析源码的收益点。推测作者的用意，还有没有更好的办法，不是提示思维的最佳方式吗？
## 一.文件结构
路径 | 描述
---|---
/diff/catch-error.js  | 处理组件异常
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

#### 1. vnode
vnode是一个节点描述的对象。项目打包环节中，babel的transform-react-jsx插件默认会将jsx语法编译成React.createElement(type, props, children)形式，对应的是(元素类型,元素属性,元素子节点)。preact中需要设置此插件参数，使React.createElement对应为h函数，最终编译结果如下：
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
当执行render函数时，先执行**h**函数, h 函数是createElement函数的别名，其中defaultProps就是在这个函数里处理的。最后又调用了createVNode函数，而createVNode返回了一个虚拟节点对象，所以`h(App,null)`的最终执行结果是`{type:App,props:null,key:null,ref:null}`。
```jsx harmony
//src/create-element.js
//创建元素
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
当执行完`h(App,null)`后，render函数会拿执行结果`{type:App,props:null,key:null,ref:null}`去渲染真实dom，下面就是render函数的相关代码。首先会对传进来的虚拟节点套用一个Fragment的父节点，然后调用diff函数来比较虚拟节点渲染真实的dom，当然首次render时旧的虚拟节点基本都是一个空对象。当diff完成后也就是真实dom创建挂载完成，然后执行了commitRoot函数，这个函数主要是执行一些组件的did生命周期和setState回调。
```jsx harmony
//src/render.js
function render(vnode, parentDom, replaceNode) {
	let oldVNode = parentDom._children;
	//用Fragment包装下
	vnode = createElement(Fragment, null, [vnode]);
	//未卸载的组件列表
	let commitQueue = [];
	diff(
		parentDom,
		parentDom._children = vnode,
		oldVNode || EMPTY_OBJ,
		EMPTY_OBJ,
		parentDom.ownerSVGElement !== undefined,
		parentDom.childNodes,
        commitQueue,
        EMPTY_OBJ
	);
	//渲染完成时执行did生命周期和setState回调
	commitRoot(commitQueue, vnode);
}
```
#### 2. diff
虚拟节点的对比主要有diff,diffElementNodes,diffChildren,diffProps四个函数。diff过程中会对新旧虚拟节点和新旧props做比较，然后渲染出真实的dom。<br />
diff函数主要处理函数型节点，也就是类型为类组件和无状态组件的虚拟节点，如果不是函数类型节点则会调用diffElementNodes函数来处理。先判断虚拟节点是否有_component属性，如果没有则实例化一个组件，然后执行组件的一些生命周期。完成后执行组件的render方法，在执行完render方法后会把返回的虚拟节点保存在虚拟节点的_children属性中，然后调用diffChildren函数来比较子节点，最后diff函数会返回虚拟节点生成的dom。
```jsx harmony
//src/diff/index.js
function diff(
	parentDom,
	newVNode,
	oldVNode,
	context,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let tmp,newType = newVNode.type;

	//非虚拟节点直接返回
	if (newVNode.constructor !== undefined) return null;
	//diff钩子
	if ((tmp = options._diff)) tmp(newVNode);

	try {
		//如果是类组件或者函数组件
		outer: if (typeof newType === 'function') {
			let c, isNew, oldProps, oldState, snapshot, clearProcessingException;
			let newProps = newVNode.props;
			//如果已经存在实例化的组件
			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
			} else {
				if ('prototype' in newType && newType.prototype.render) {
					//类组件的话  去实例化
					newVNode._component = c = new newType(newProps, cctx);
				} else {
					//函数组件的话会实例化Component
					newVNode._component = c = new Component(newProps, cctx);
					c.constructor = newType;
					//设置render
					c.render = doRender;
				}
				c.props = newProps;
				if (!c.state) c.state = {};
				//标记需要渲染并且是新创建的组件
				isNew = c._dirty = true;
				c._renderCallbacks = [];
			}

			//如果nextState为空则赋值state
			if (c._nextState == null) {
				c._nextState = c.state;
			}
			//有getDerivedStateFromProps执行此生命周期并扩展到_nextState
			if (newType.getDerivedStateFromProps != null) {
				//如果nextState和state相同则拷贝nextState到nextState
				if (c._nextState == c.state) {
					c._nextState = assign({}, c._nextState);
				}

				assign(
					c._nextState,
					newType.getDerivedStateFromProps(newProps, c._nextState)
				);
			}

			oldProps = c.props;
			oldState = c.state;

			//如果是新创建的组件
			if (isNew) {
				//没有设置getDerivedStateFromProps但设置了componentWillMount则执行componentWillMount生命周期
				if (
					newType.getDerivedStateFromProps == null &&
					c.componentWillMount != null
				) {
					c.componentWillMount();
				}
				//如果有componentDidMount则放到_renderCallbacks
				if (c.componentDidMount != null) {
					c._renderCallbacks.push(c.componentDidMount);
				}
			} else {
				//没有设置getDerivedStateFromProps并且不是forceUpdate并且设置了componentWillReceiveProps则执行此生命周期
				if (
					newType.getDerivedStateFromProps == null &&
					c._force == null &&
					c.componentWillReceiveProps != null
				) {
					c.componentWillReceiveProps(newProps, cctx);
				}
				//如果不是forceUpdate并且shouldComponentUpdate则执行此生命周期返回false的情况下
				if (
					!c._force &&
					c.shouldComponentUpdate != null &&
					c.shouldComponentUpdate(newProps, c._nextState, cctx) === false
				) {
					c.props = newProps;
					c.state = c._nextState;
					//标记已渲染
					c._dirty = false;
					c._vnode = newVNode;
					//dom还是老虚拟节点的dom
					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
					//添加回调
					if (c._renderCallbacks.length) {
						commitQueue.push(c);
					}
					//给children设置_parent
					for (tmp = 0; tmp < newVNode._children.length; tmp++) {
						if (newVNode._children[tmp]) {
							newVNode._children[tmp]._parent = newVNode;
						}
					}
					//跳出outer
					break outer;
				}
				//如果设置了componentWillUpdate则执行此生命周期
				if (c.componentWillUpdate != null) {
					c.componentWillUpdate(newProps, c._nextState, cctx);
				}
				//如果componentDidUpdate不为空则放到_renderCallbacks中
				if (c.componentDidUpdate != null) {
					c._renderCallbacks.push(() => {
						c.componentDidUpdate(oldProps, oldState, snapshot);
					});
				}
			}

			c.props = newProps;
			c.state = c._nextState;
			//render钩子
			if ((tmp = options._render)) tmp(newVNode);
			//标记已渲染
			c._dirty = false;
			c._vnode = newVNode;
			c._parentDom = parentDom;
			//执行render
			tmp = c.render(c.props, c.state, c.context);
			//如果render返回结果中最外层是Fragment组件
			let isTopLevelFragment =
				tmp != null && tmp.type == Fragment && tmp.key == null;
			//Fragment组件则使用props.children，其它使用render返回的
			newVNode._children = toChildArray(
				isTopLevelFragment ? tmp.props.children : tmp
			);
			//如果是Provider组件，然后调用getChildContext
			if (c.getChildContext != null) {
				context = assign(assign({}, context), c.getChildContext());
			}
			//执行getSnapshotBeforeUpdate生命周期
			if (!isNew && c.getSnapshotBeforeUpdate != null) {
				snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}
			//对比子节点
			diffChildren(
				parentDom,
				newVNode,
				oldVNode,
				context,
				isSvg,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating
			);

			c.base = newVNode._dom;
			//有renderCallback则放到commitQueue中，所有渲染完成一起执行
			if (c._renderCallbacks.length) {
				commitQueue.push(c);
			}
			//清除error
			if (clearProcessingException) {
				c._pendingError = c._processingException = null;
			}
			//设置强制更新为false
			c._force = null;
		} else {
			//其它类型调用diffElementNodes去比较
			newVNode._dom = diffElementNodes(
				oldVNode._dom,
				newVNode,
				oldVNode,
				context,
				isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);
		}
		//diffed钩子
		if ((tmp = options.diffed)) tmp(newVNode);
	} catch (e) {
		//触发错误
		options._catchError(e, newVNode, oldVNode);
	}

	return newVNode._dom;
}
```
diffElementNodes主要处理了html型的虚拟节点，这儿会生成真实的dom节点。<br />
首先从参数excessDomChildren中查找能否复用之前的dom节点。如果没有复用，则会调用createTextNode或者createElement来创建一个节点。然后调用diffProps来比较props处理节点的属性，比如样式、事件监听等。diffProps这个函数的代码就不贴了，可以去源码中去看，都有详细的注释。然后调用了diffChildren来比较子节点并将子节点的dom添加到当前dom节点。
```jsx harmony
//src/diff/index.js
function diffElementNodes(
	dom,
	newVNode,
	oldVNode,
	context,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
) {
	let i;
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;

	//判断是否是svg
	isSvg = newVNode.type === 'svg' || isSvg;
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
	//如果dom为空
	if (dom == null) {
		//text节点
		if (newVNode.type === null) {
			return document.createTextNode(newProps);
		}
		//创建元素
		dom = isSvg
			? document.createElementNS('http://www.w3.org/2000/svg', newVNode.type)
			: document.createElement(newVNode.type);
		//以下流程中 excessDomChildren表示dom的子节点,这儿的dom是新创建的,所以要设为null,表示不可复用子节点
		excessDomChildren = null;
	}
	//如果是text节点
	if (newVNode.type === null) {
		//如果diffElementNodes传进来dom就不为空,则将excessDomChildren对应的节点设为null
		if (excessDomChildren != null) {
			excessDomChildren[excessDomChildren.indexOf(dom)] = null;
		}
		//如果两者不相等,则设置data来更新TextNode的文本
		if (oldProps !== newProps) {
			dom.data = newProps;
		}
	}
	//新老节点不相等
	else if (newVNode !== oldVNode) {
		if (excessDomChildren != null) {
			excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}
		oldProps = oldVNode.props || EMPTY_OBJ;

		let oldHtml = oldProps.dangerouslySetInnerHTML;
		let newHtml = newProps.dangerouslySetInnerHTML;

		//如果是非hydration模式则执行以下,因为hydration模式不会处理props
		if (!isHydrating) {
			//如果oldProps是空对象,则将dom的属性扩展给oldProps
			if (oldProps === EMPTY_OBJ) {
				oldProps = {};
				for (let i = 0; i < dom.attributes.length; i++) {
					oldProps[dom.attributes[i].name] = dom.attributes[i].value;
				}
			}
			//新的props或者老的props有设置dangerouslySetInnerHTML
			if (newHtml || oldHtml) {
				//newHtml为空或者oldHtml为空或者 oldHtml与newHtml不相同  则设置给innerHTML
				if (!newHtml || !oldHtml || newHtml.__html != oldHtml.__html) {
					dom.innerHTML = (newHtml && newHtml.__html) || '';
				}
			}
		}
		//对比元素的属性
		diffProps(dom, newProps, oldProps, isSvg, isHydrating);
		//设置_children
		newVNode._children = newVNode.props.children;

		//如果没有设置newHtml则比较children
		if (!newHtml) {
			diffChildren(
				dom,
				newVNode,
				oldVNode,
				context,
				newVNode.type === 'foreignObject' ? false : isSvg,
				excessDomChildren,
				commitQueue,
				EMPTY_OBJ,
				isHydrating
			);
		}

		//如果是非hydration模式
		if (!isHydrating) {
			//如果value在newProps中并且value与dom的value不相同则设置value
			//为什么不在diffProps中处理呢?因为option这种不设置value会从元素的文本内容中获取
			//所以要等子元素处理完了在处理这个
			if (
				'value' in newProps &&
				newProps.value !== undefined &&
				newProps.value !== dom.value
			) {
				dom.value = newProps.value == null ? '' : newProps.value;
			}
			//处理checked
			//在这儿是保证了顺序,先处理value,在处理checked
			if (
				'checked' in newProps &&
				newProps.checked !== undefined &&
				newProps.checked !== dom.checked
			) {
				dom.checked = newProps.checked;
			}
		}
	}

	return dom;
}
```
在diffChildren主要处理了子节点的比较，首先从excessDomChildren中寻找对应节点已经存在的dom，然后对子节点进行遍历。如果子节点的key和type与之前虚拟节点或者紧跟节点相同，oldNode则会使用之前的这个节点。接下来会去调用diff来比较新老虚拟节点，返回真实的dom，然后会把子节点的真实dom追加到parentDom里面或者parentDom子节点的后面。
```jsx harmony
///src/diff/children.js
function diffChildren(
	parentDom,
	newParentVNode,
	oldParentVNode,
	context,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let i, j, oldVNode, newDom, sibDom, firstChildDom, refs;
	
	//老节点的children
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;
	//老节点长度
	let oldChildrenLength = oldChildren.length;

	//只有在render函数和diffElementNodes函数调用diffChildren时，oldDom可能等于EMPTY_OBJ
	//所以只有标签型节点或者render进来的组件型节点处理,其它的组件类型这儿不用处理
	if (oldDom == EMPTY_OBJ) {
		//如果有excessDomChildren,则取第一个
		if (excessDomChildren != null) {
			oldDom = excessDomChildren[0];
			//如果oldChildrenLength,则从虚拟节点中查找
		} else if (oldChildrenLength) {
			oldDom = getDomSibling(oldParentVNode, 0);
		} else {
			oldDom = null;
		}
	}

	i = 0;
	newParentVNode._children = toChildArray(
		newParentVNode._children,
		childVNode => {
			if (childVNode != null) {
				//设置父虚拟节点
				childVNode._parent = newParentVNode;
				//处理深度
				childVNode._depth = newParentVNode._depth + 1;

			
				oldVNode = oldChildren[i];
				//如果老节点为null或者 新老子节点的key和type相同 则设置老节点删除 以便后面不执行unmount和参与后续节点的比较
				if (
					oldVNode === null ||
					(oldVNode &&
						childVNode.key == oldVNode.key &&
						childVNode.type === oldVNode.type)
				) {
					oldChildren[i] = undefined;
				} else {
					//在老的子节点中循环 以便找到新老子节点相对应的，有相对应的就会复用这个节点
					for (j = 0; j < oldChildrenLength; j++) {
						oldVNode = oldChildren[j];
						//同上
						if (
							oldVNode &&
							childVNode.key == oldVNode.key &&
							childVNode.type === oldVNode.type
						) {
							oldChildren[j] = undefined;
							break;
						}
						//都没匹配 老节点为null
						oldVNode = null;
					}
				}

				oldVNode = oldVNode || EMPTY_OBJ;

				//对比节点
				newDom = diff(
					parentDom,
					childVNode,
					oldVNode,
					context,
					isSvg,
					excessDomChildren,
					commitQueue,
					oldDom,
					isHydrating
				);
				//如果新子节点有ref并且不等于老子节点的ref，推到refs等会会执行去掉老节点ref并重新应用新节点ref
				if ((j = childVNode.ref) && oldVNode.ref != j) {
					if (!refs) refs = [];
					if (oldVNode.ref) refs.push(oldVNode.ref, null, childVNode);
					refs.push(j, childVNode._component || newDom, childVNode);
				}
				//如果newDom
				if (newDom != null) {
					//处理firstChildDom
					if (firstChildDom == null) {
						firstChildDom = newDom;
					}
					//如果子节点是函数或类型组件,这儿特殊处理 使其不会执行下面的parentDom.appendChild或parentDom.insertBefore
					if (childVNode._lastDomChild != null) {
						newDom = childVNode._lastDomChild;

						childVNode._lastDomChild = null;
					//如果excessDomChildren等于oldVNode或者newDom不等于oldDom或者newDom.parentNode为空
					//render函数调用时excessDomChildren与oldVNode有可能相等
					} else if (
						excessDomChildren == oldVNode ||
						newDom != oldDom ||
						newDom.parentNode == null
					) {
						//如果oldDom为空或者其父节点更新了,则将newDom追加到parentDom的后面
						outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
							parentDom.appendChild(newDom);
						} else {
							// `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
							//这儿的条件是...j < oldChildrenLength / 2;j++
							//如果紧跟节点和新节点相同,则直接跳出
							//为什么只判断了对比了一半元素呢,猜测是为性能考虑,如果前面一般都不相同后面基本不会相同
							for (
								sibDom = oldDom, j = 0;
								(sibDom = sibDom.nextSibling) && j < oldChildrenLength;
								j += 2
							) {
								if (sibDom == newDom) {
									break outer;
								}
							}
							//添加到oldDom前面
							parentDom.insertBefore(newDom, oldDom);
						}

					
						//如果option不设置value他将会从元素的文本内容中获取,这儿主要修复这个
						if (newParentVNode.type == 'option') {
							parentDom.value = '';
						}
					}
					//oldDom这时为newDom元素之后紧跟的节点
					oldDom = newDom.nextSibling;
					//如果是组件类型的节点,设置_lastDomChild
					if (typeof newParentVNode.type == 'function') {
						newParentVNode._lastDomChild = newDom;
					}
				}
			}

			i++;
			return childVNode;
		}
	);
	//设置_dom 函数类型的节点 _dom为第一个子节点的dom,其它的为本身创建的dom节点
	newParentVNode._dom = firstChildDom;

	//移除不使用的的子dom元素
	if (excessDomChildren != null && typeof newParentVNode.type !== 'function') {
		for (i = excessDomChildren.length; i--; ) {
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
		}
	}

	//循环卸载不使用的老虚拟节点
	for (i = oldChildrenLength; i--; ) {
		if (oldChildren[i] != null) unmount(oldChildren[i], oldChildren[i]);
	}

	//循环应用refs
	if (refs) {
		for (i = 0; i < refs.length; i++) {
			applyRef(refs[i], refs[++i], refs[++i]);
		}
	}
}
```
分析下diff执行流程。render函数执行后，执行diff函数来比较newVNode为`{type:App,props:null}`和oldVNode为EMPTY_OBJ的虚拟节点。由于`oldVNode._component`属性为空，然后通过`new App()`来实例化一个组件并赋值给`newVNode._component`，继续执行App组件的一些生命周期后继续执行App组件的render方法，然后把render方法执行返回的虚拟节点保存在newVNode的_children属性下，然后调用diffChildren去比较子节点。此时整个的虚拟节点数如下：
```json5
{
	"type": App,
	"props": null,
	"_children": {
		"type": "div",
		"props": {id: "wrap"},
		"_children": [
			{
				"type": "span",
				"props": null,
				"_children": {
					"type": null,
					"props": 123,
				}
			},
			{
				"type": null,
				"props": 456
			}
		]

	}
}
```
在diffChildren中先读取newVNode类型为App的_children属性，与oldVNode子节点进行遍历比较。此时第一个子节点是类型为div的虚拟节点，然后把这个虚拟节点作为参数再调用diff函数。在diff函数中判断是html型节点，调用diffElementNodes函数，然后在这个函数中会创建div真实dom节点。再调用diffChildren来对比div节点的虚拟子节点，如此递归比较完所有div的虚拟节点后会将真实的dom添加到div节点中去。在diffChildren中会将div真实dom添加到parentDom节点中去，也就是document.getElementById('app')节点
## 三.组件
### 1.component
Component构造函数
```jsx harmony
//src/component.js
function Component(props, context) {
	this.props = props;
	this.context = context;
}
```

设置状态。可以看到将新的状态保存在_nextState，然后调用enqueueRender(this)把当前组件加入到待渲染队列并渲染，在diff渲染过程中会将_nextState设置给state。
```jsx harmony
Component.prototype.setState = function(update, callback) {
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
```
强制渲染。通过设置_force来标记是强制渲染，然后加入渲染队列并渲染。如果_force为真，则在diff渲染中不会触发组件的某些生命周期。
```jsx harmony
Component.prototype.forceUpdate = function(callback) {
	if (this._vnode) {
		//标记强制更新
		this._force = true;
		//有回调加入回调数组里
		if (callback) this._renderCallbacks.push(callback);
		//加入渲染队列并渲染
		enqueueRender(this);
	}
};
```
render函数，默认是Fragment组件，返回子节点。
```jsx harmony
Component.prototype.render = Fragment;
function Fragment(props) {
	return props.children;
}
```
enqueueRender函数会把待渲染的组件加入渲染队列，然后延迟执行process函数。<br />
process函数会先按照组件的深度进行排序，最外层的组件最先渲染。<br />
如果_dirty为真表示需要渲染，然后会调用renderComponent渲染组件。渲染后会设置该组件_dirty为false，防止重复渲染。
```jsx harmony
//待渲染组件列表
let q = [];

//延迟执行
const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;

//延迟执行的钩子
let prevDebounce;

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

//遍历队列渲染组件
function process() {
	let p;
	//按深度排序 最顶级的组件的最先执行
	q.sort((a, b) => b._vnode._depth - a._vnode._depth);
	while ((p = q.pop())) {
		//如果组件需要渲染则渲染它
		if (p._dirty) renderComponent(p);
	}
}
```
renderComponent来渲染组件。通过调用diff来比较虚拟节点并更新真实dom，完成后执行所有组件的did生命周期和setState的回调函数。
```jsx harmony
function renderComponent(component) {
	let vnode = component._vnode,
		oldDom = vnode._dom,
		parentDom = component._parentDom;

	if (parentDom) {
		let commitQueue = [];
		//比较更新
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
```
### 2.context
这是一个context的使用案例，跨组件传递数据。首先通过createContext创建一个context，里面包含Provider和Consumer两个组件。<br />
Provider组件用在最外层，通过设置value来跨组件传递数据。<br />
Consumer组件主要是使用数据，子节点必须是一个函数，第一个参数就是Provider组件的value。
```jsx harmony
import { createContext, h, render } from 'preact';

const FontContext = createContext(20);

function Child() {
	return <FontContext.Consumer>
		{fontSize=><div style={{fontSize:fontSize}}>child</div>}
	</FontContext.Consumer>
}
function App(){
	return <Child/>
}
render(
	<FontContext.Provider value={26}>
		<App/>
	</FontContext.Provider>,
	document.getElementById('app')
);

```

源码也比较简单，调用createContext后会返回一个context对象，里面包含了Consumer与Provider组件。<br />
Consumer组件设置了静态属性contextType，渲染时会执行子节点，并把context做为参数，等同于如下类组件。
```jsx harmony
class Consumer extends Comment{
    //context新创建的context
    static contextType = context;
    render(){
        return this.props.children(this.context);   
    }
}
```
Provider组件中创建了一些函数。当渲染到Provider组件时，调用getChildContext来获得ctx对象，然后在渲染diff比较Provider组件的子孙节点时都会向下传递这个ctx。如果某个子孙节点组件设置了contextType静态属性，会调用sub方法把该组件添加到订阅数组中。当Provider组件value更新时，会触发shouldComponentUpdate生命周期，然后执行渲染所有的订阅组件。
```jsx harmony
//src/create-context.js
let i = 0;
//defaultValue参数是 只有组件的祖先组件中没有Provider组件才使用这个，不是Provider没有设置value
export function createContext(defaultValue) {
	const ctx = {};

	const context = {
		_id: '__cC' + i++,
		_defaultValue: defaultValue,
		//context消费者
		Consumer(props, context) {
			//把context传给children执行
			return props.children(context);
		},
		//context提供者
		Provider(props) {
			if (!this.getChildContext) {
				const subs = [];
				//渲染Provider时调用这个然后吧ctx作为context传递给下级组件
				this.getChildContext = () => {
					ctx[context._id] = this;
					//至于为什么不直接返回context而是返回ctx对象
					//是由于Provider组件后代也可以有Provider组件,context的消费者只取contextType中_id像匹配的
					//见diff/index.js中diff->outer-> let provider = tmp && context[tmp._id];
					return ctx;
				};
				this.shouldComponentUpdate = _props => {
					//当value不相等时
					if (props.value !== _props.value) {
						//执行渲染 context消费的组件
						subs.some(c => {
							c.context = _props.value;
							enqueueRender(c);
						});
					}
				};

				this.sub = c => {
					//添加到组件更新队列中，当value改变时渲染该组件
					subs.push(c);
					let old = c.componentWillUnmount;
					//当组件卸载后从队列中删除，然后执行老的componentWillUnmount
					c.componentWillUnmount = () => {
						subs.splice(subs.indexOf(c), 1);
						old && old.call(c);
					};
				};
			}
			return props.children;
		}
	};
	//设置contextType
	context.Consumer.contextType = context;

	return context;
}
```
这是diff中关于context的相关代码。在处理组件类型虚拟节点时，先获取静态属性contextType。如果存在然后通过id找到context，计算context的value并赋值给cctx变量，这个变量然后会赋值给组件的context实例属性。如果是新创建的组件，则会去调用sub函数来订阅Provider组件的value更新，也就是当value更新时会渲染这个组件。然后会把context赋值给_context，在setState后进入diff时会读取这个变量并向下传递。
```jsx harmony
//src/diff/index.js
function diff(
	parentDom,
	newVNode,
	oldVNode,
	context,
	isSvg,
	excessDomChildren,
	commitQueue,
	oldDom,
	isHydrating
) {
	let tmp,newType = newVNode.type;
	if (typeof newType === 'function') {
		let c;
		let newProps = newVNode.props;

		tmp = newType.contextType;
		//找到祖先的provider
		let provider = tmp && context[tmp._id];
		//有tmp时，如果提供provider时为provider的value，不然为createContext的defaultValue
		//没有则为父节点传递下来的context
		let cctx = tmp
			? provider
				? provider.props.value
				: tmp._defaultValue
			: context;
		//省略一些代码
		if (oldVNode._component) {
			c = newVNode._component = oldVNode._component;
		} else {
			newVNode._component = c = new newType(newProps, cctx);
			//订阅，当provider组件value改变时，渲染组件
			if (provider) provider.sub(c);
			c._context = context;
		}

		c.context = cctx;
		//如果是Provider组件，然后调用getChildContext获取ctx对象并向下传递
		if (c.getChildContext != null) {
			context = assign(assign({}, context), c.getChildContext());
		}
		//对比子节点
		diffChildren(
			parentDom,
			newVNode,
			oldVNode,
			context,
			isSvg,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating
		);

	}
}
```
## 四.解惑疑点
#### 1. defer
```jsx harmony
//src/component.js
const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;
```
用意大家基本都懂。如果支持Promise，用Promise处理，不然的话用setTimeout处理。但是`Promise.prototype.then.bind(Promise.resolve())`他最终到底是啥东西，我是想了很长一段时间。我们知道`Promise.prototype.then`会把this作为Promise的实例。而后面的这段代码`...then.bind(Promise.resolve())`，其中bind会改变this的指向，所以这儿将是`Promise.resolve()`的返回结果，最终等同于`Promise.resolve().then`。
#### 2. vnode用Fragment包装
```jsx harmony
//src/render.js
function render(vnode, parentDom, replaceNode) {
	//...
	vnode = createElement(Fragment, null, [vnode]);
	//...
}
```
发现render函数中会用Fragment嵌套实际传进来的虚拟节点，为什么要用Fragment包装呢？如果不包装会怎么样呢？假如执行这个代码`render(<div>123</div>,document.getElementBuId('App'))`，当执行到diff函数时，会直接调用`newVNode._dom = diffElementNodes(oldVNode._dom,newVNode,oldVNode,)`。这样最终生成的dom无法与parentDom相关联，也就是不会添加到parentDom里面中去。而如果用Fragment嵌套下，在diff中判断是函数类型，于是执行`diffChildren(parentDom,newVNode,oldVNode...)`，这样会在diffChildren中把生成的dom添加到parentDom中。
#### 3. hydrate渲染
```jsx harmony
//src/render.js
function hydrate(vnode, parentDom) {
	render(vnode, parentDom, IS_HYDRATE);
}

```
用hydrate与render两个渲染有什么区别呢？从代码中我们发现在hydrate模式中，diffProps只处理了事件部分，对其他的props没有处理。所以hydrate常用于在服务器渲染的html，在客户端渲染时会用hydrate去渲染。由于props在服务端渲染的时候已经处理好了，所以在客户端渲染的时候就不用处理了，从而加快首次渲染速度。
#### 4. props中value与checked单独处理  
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
在diffProps并没有对value与checked处理，而是在`diffChildren()`后对value与checked做了处理，这个在diffChildren中算是找到了原因。
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
在这儿为什么要设置value为空呢？原来w3c规定，如果option元素不设置value，那么会把元素的文本内容作为option的value。当然还有一些元素是同样的逻辑，不设置value，会从子元素中获取。所以在mvvm中会有问题的，这样谈不上数据与dom双向绑定。必须要在子元素渲染后完成设置value为空，然后再从props中处理元素value。
#### 5. 已经setState又去渲染组件
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
	}
    //...
    return enqueueRender((component._pendingError = component));
    //...
}
```
当虚拟节点出现异常后，会触发_catchError函数。他会不断的寻找该虚拟节点的祖先节点，直到祖先节点设置了getDerivedStateFromError或者componentDidCatch，然后由这个组件的该函数处理异常。不然直到最顶级组件都没有处理异常，则会抛出异常。上面这段代码中如果设置了`getDerivedStateFromError`，然后去调用了`component.setState`来渲染更新组件，但是后面还调用了`enqueueRender(component)`来渲染了组件，有必要吗？其实是有必要的，这儿主要是为了防止如果`setState`后没有对异常做处理，那么执行`enqueueRender`渲染后还会出现异常，这时处理异常会再循环并跳过这个组件,继续向上寻找组件来处理异常。
#### 6. 标记组件‘处理异常中’用了两个变量
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
 `catchError`中用 `_processingException`来判断这个组件是否处理异常中，而在`component._pendingError = component`却设置了_pendingError来标记这个组件是在处理异常中，在`diff`中又赋给了`_processingException`。为什么不用一个变量来标记呢，其实主要原因是如果渲染队列中前面已经有他的子组件需要渲染，此时渲染子组件出现异常，这时不应该跳过这个组件。只有在渲染这个组件的时候才去标记这个组件正在处理异常中。
#### 7. diffProps中事件的处理
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
这儿对props的事件处理有点意思。如果props中设置了事件，例如`<input onChange={e=>console.log(e.target.value)} />`，假设`onChange`之前设置的是空，那么会执行`dom.addEventListener(name, eventProxy, useCapture)`来给dom添加一个事件处理函数，而这个处理函数是一个固定的函数`eventProxy`。当后面onChange中的监听函数发生变化时，并不会重新添加新的监听函数，而是只要修改下dom._listeners对应的函数就行了。当触发事件时，只会执行固定的dom._listeners中保存的监听函数。只有onChange设置了空才去移除这个监听，所有当onChange中的监听函数发生变化时并不会移除之前的监听函数，然后添加新的监听函数。
#### 8. _lastDomChild的用处
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
        newParentVNode._lastDomChild = newDom;
    }
    //...
}
```
用_lastDomChild的意义何在呢？原来当子节点渲染完成，他就会与父节点做关联。例如`<div>123</div>`，当文本节点123创建完成，就会添加到div元素中，这是没有问题的。但是如果父节点是一个函数类型的节点,这时在diffChildren中就没有必要去关联了。例如下面的代码：
```jsx harmony
function App() {
	return <div>123</div>;
}
render(<App/>,document.getElementById('root'));
```
上面代码中一共会有三个虚拟节点App、div、123，在执行diffChildren函数来比较App虚拟节点时，newDom为div节点，这时不用执行 `parentDom.appendChild(newDom)`。root节点与div节点的关联其实是在执行diffChildren函数比较div虚拟节点中已经处理了，所以diffChildren比较App虚拟节点时就不用处理父子节点的关联。
#### 9. excessDomChildren已经设置了null，后面又去设置了null
```jsx harmony
//src/diff/index.js
function diffElementNodes(dom,newVNode,oldVNode,context,isSvg,excessDomChildren,){
	//判断能否复用excessDomChildren中的dom
	if (dom == null && excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			const child = excessDomChildren[i];
			//如果虚拟节点类型为null而存在节点类型是text或者虚拟节点类型和存在节点类型相同，则复用dom节点
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
    //如果是文本节点
	if (newVNode.type === null) {
		//如果diffElementNodes传进来dom就不为空,则将excessDomChildren对应的节点设为null
		if (excessDomChildren != null) {
			excessDomChildren[excessDomChildren.indexOf(dom)] = null;
		}
		//如果两者不相等,则设置data来更新TextNode的文本
		if (oldProps !== newProps) {
			dom.data = newProps;
		}
	}
}
//src/diff/children.js
function diffChildren(parentDom, newParentVNode, oldParentVNode, context, isSvg, excessDomChildren) {
    //...
    //移除excessDomChildren中不能复用的代码
	if (excessDomChildren != null && typeof newParentVNode.type !== 'function') {
		for (i = excessDomChildren.length; i--;) {
			if (excessDomChildren[i] != null) removeNode(excessDomChildren[i]);
		}
	}
}
```
这儿我一直觉得没必要再去`excessDomChildren[excessDomChildren.indexOf(dom)] = null`，因为前面已经设置为null。我认为是作者忘记改了，后来翻了翻github，终于理解作者的用意。
```jsx harmony
render(<p>2</p>, document.getElementById('app'));
render(
	<p>3</p>,
	document.getElementById('app'),
	document.getElementById('app').firstChild
);
```
如果不加那一个段代码，那么上面的代码会渲染为空。我们分析下，执行第一个render时渲染是正常的。在执行第二个render时，此时render的replaceNode参数为`document.getElementById('app').firstChild`，也就是p节点，这次渲染是不能渲染出3文本节点的，为什么呢？原理在`diffElementNodes`文本节点3时，这时dom不为空，所以不会执行`excessDomChildren[i] = null`。但这儿还会复用之前的text为2的节点，只不过将内容设置成了3。后面如果不将`excessDomChildren`中之前的文本节点设为空，那么当执行diffChildren对比p元素时，会移除这个以前的text节点，所以什么就会渲染空。这部分还是比较复杂，建议多读读源码理解。
