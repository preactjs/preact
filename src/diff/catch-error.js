import { enqueueRender } from '../component';

/**
 * Find the closest error boundary to a thrown error and call it
 * @param {object} error The thrown value
 * @param {import('../internal').VNode} vnode The vnode that threw
 * the error that was caught (except for unmounting when this parameter
 * is the highest parent that was being unmounted)
 */
//处理虚拟节点错误
export function _catchError(error, vnode) {
	/** @type {import('../internal').Component} */
	let component;
	//不断向上循环父组件
	for (; (vnode = vnode._parent); ) {
		//有父组件并且该父组件不是异常
		//TODO 感觉这儿直接可以用component._pendingError代替_processingException
		if ((component = vnode._component) && !component._processingException) {
			try {
				//如果组件有静态getDerivedStateFromError，将执行结果传给setState
				if (
					component.constructor &&
					component.constructor.getDerivedStateFromError != null
				) {
					component.setState(
						component.constructor.getDerivedStateFromError(error)
					);
				//如果设置了componentDidCatch，则执行componentDidCatch
				} else if (component.componentDidCatch != null) {
					component.componentDidCatch(error);
				//没有以上设置再继续循环他的父组件
				} else {
					continue;
				}
				//再去渲染处理error的组件
				//如果render后还是有error,会再循环并跳过这个组件,如果循环完成组件都没有处理错误,则会执行最下面throw error
				//_pendingError标记此组件有错误，再次渲染会赋值给_processingException，这样如果还出错会跳过这个组件，再向上层组件循环
				return enqueueRender((component._pendingError = component));
			} catch (e) {
				error = e;
			}
		}
	}
	//如果没有getDerivedStateFromError或componentDidCatch，则抛出error
	throw error;
}
