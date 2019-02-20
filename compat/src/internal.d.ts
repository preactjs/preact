import { CoreVNode } from '../../src/internal';
export { PreactElement, ComponentFactory } from '../../src/internal'
export { ComponentChildren } from '../../src/index';

export interface VNode<T = any> extends CoreVNode<T> {
	$$typeof: symbol | string;
}
