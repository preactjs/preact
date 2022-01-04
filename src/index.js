export { render, hydrate } from './render';
export {
	createElement,
	createElement as h,
	createVNode,
	Fragment,
	createRef,
	isValidElement
} from './create-element';
export {
	Component,
	getDomSibling,
	updateParentDomPointers,
	renderComponent
} from './component';
export { cloneElement } from './clone-element';
export { createContext } from './create-context';
export {
	toChildArray,
	diffChildren,
	reorderChildren,
	placeChild
} from './diff/children';
export {
	diff,
	diffElementNodes,
	unmount,
	applyRef,
	doRender,
	commitRoot
} from './diff/index';
export { diffProps, setProperty } from './diff/props';
export { EMPTY_OBJ, EMPTY_ARR } from './constants';
export { assign, removeNode, slice } from './util';
export { default as options } from './options';
