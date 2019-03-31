import { Ref } from '../../src/index';
import {
  Component as PreactComponent,
  VNode as PreactVNode,
  FunctionalComponent as PreactFunctionalComponent
} from '../../src/internal';

export { ComponentChildren } from '../../src/index';

export { PreactElement } from '../../src/internal';

export interface Component<P = {}, S = {}> extends PreactComponent<P, S> {
  isReactComponent: object;
  isPureReactComponent?: true;
}

export interface FunctionalComponent<P = {}> extends PreactFunctionalComponent<P> {
  shouldComponentUpdate?(nextProps: Readonly<P>): boolean;
  _forwarded?: true;
}

export interface VNode<T = any> extends PreactVNode<T> {
  $$typeof: symbol | string;
  preactCompatNormalized: boolean;
}

export interface ForwardFn<P = {}, T = any> {
  (props: P, ref: Ref<T>): VNode;
  displayName?: string;
}
