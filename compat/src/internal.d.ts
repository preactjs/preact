import { CoreVNode } from '../../src/internal';
export { PreactElement, ComponentFactory } from '../../src/internal'
export { ComponentChildren, Ref, ComponentFactory, FunctionalComponent } from '../../src/index';

export interface VNode<T = any> extends CoreVNode<T> {
	$$typeof: symbol | string;
}

export type ForwardFn<T = any, P = {}> = (props: P, ref: Ref<T>) => ComponentFactory<P>;
