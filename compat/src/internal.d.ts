import {
	Component as PreactComponent,
	VNode as PreactVNode,
	FunctionalComponent as PreactFunctionalComponent
} from '../../src/internal';
import { SuspenseProps } from './suspense';

export { ComponentChildren } from '../..';

export { PreactElement } from '../../src/internal';

export interface Component<P = {}, S = {}> extends PreactComponent<P, S> {
	isReactComponent?: object;
	isPureReactComponent?: true;

	_childDidSuspend?(error: Promise<void>): void;
}

export interface FunctionalComponent<P = {}>
	extends PreactFunctionalComponent<P> {
	shouldComponentUpdate?(nextProps: Readonly<P>): boolean;
	_forwarded?: boolean;
}

export interface VNode<T = any> extends PreactVNode<T> {
	$$typeof?: symbol | string;
	preactCompatNormalized?: boolean;
}

export interface SuspenseState {
	_suspended?: null | VNode<any>;
}

export interface SuspenseComponent
	extends PreactComponent<SuspenseProps, SuspenseState> {
	_suspensions: number;
	_detachOnNextRender: null | VNode<any>;
}
