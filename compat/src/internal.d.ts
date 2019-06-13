import { Ref } from '../..';
import {
  Component as PreactComponent,
  VNode as PreactVNode,
	FunctionalComponent as PreactFunctionalComponent
} from '../../src/internal';
import { SuspenseProps } from './suspense';

export { ComponentChildren } from '../..';

export { PreactElement } from '../../src/internal';

export interface Component<P = {}, S = {}> extends PreactComponent<P, S> {
  isReactComponent: object;
	isPureReactComponent?: true;

	_childDidSuspend?(error: Promise<void>);
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

export interface SuspenseComponent extends PreactComponent<SuspenseProps & { maxDuration: number; }> {
	_suspensions: Array<Promise<any>>;
	_parkedChildren: PreactVNode<{}>[];
	_timeout: Promise<void>;
	_timeoutCompleted: boolean;
	__test__suspensions_timeout_race: Promise<void>
}
