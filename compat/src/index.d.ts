import * as _hooks from '../../hooks';
import * as preact from '../../src';
import { JSXInternal } from '../../src/jsx'
import * as _internal from './internal';
import * as _Suspense from './suspense';

// export default React;
export = React;
export as namespace React;
declare namespace React {
	// Export JSX
	export import JSX = JSXInternal

	// Hooks
	export import CreateHandle = _hooks.CreateHandle;
	export import EffectCallback = _hooks.EffectCallback;
	export import Inputs = _hooks.Inputs;
	export import PropRef = _hooks.PropRef;
	export import Reducer = _hooks.Reducer;
	export import Ref = _hooks.Ref;
	export import StateUpdater = _hooks.StateUpdater;
	export import useCallback = _hooks.useCallback;
	export import useContext = _hooks.useContext;
	export import useDebugValue = _hooks.useDebugValue;
	export import useEffect = _hooks.useEffect;
	export import useImperativeHandle = _hooks.useImperativeHandle;
	export import useLayoutEffect = _hooks.useLayoutEffect;
	export import useMemo = _hooks.useMemo;
	export import useReducer = _hooks.useReducer;
	export import useRef = _hooks.useRef;
	export import useState = _hooks.useState;

	// Preact Defaults
	export import Component = preact.Component;
	export import createContext = preact.createContext;
	export import createRef = preact.createRef;
	export import Fragment = preact.Fragment;
	export import createElement = preact.createElement;
	export import cloneElement = preact.cloneElement;

	// Suspense
	export import Suspense = _Suspense.Suspense;
	export import lazy = _Suspense.lazy;

	// Compat
	export import ForwardFn = _internal.ForwardFn;
	export const version: string;

	export function createPortal(vnode: preact.VNode, container: Element): preact.VNode<any>;

	export function render(vnode: preact.VNode<any>, parent: Element, callback?: () => void): Component | null;

	export function hydrate(vnode: preact.VNode<any>, parent: Element, callback?: () => void): Component | null;

	export function unmountComponentAtNode(container: Element | Document | ShadowRoot | DocumentFragment): boolean;

	export function createFactory(type: preact.VNode<any>["type"]): (props?: any, ...children: preact.ComponentChildren[]) => preact.VNode<any>;
	export function isValidElement(element: any): boolean;
	export function findDOMNode(component: preact.Component): Element | null;

	export abstract class PureComponent<P = {}, S = {}> extends preact.Component<P, S> {
		isPureReactComponent: boolean;
	}

	export function memo<P = {}>(component: preact.FunctionalComponent<P>, comparer?: (prev: P, next: P) => boolean): preact.FunctionComponent<P>;

	export function forwardRef<R, P = {}>(fn: _internal.ForwardFn<P, R>): preact.FunctionalComponent<P>;

	export function unstable_batchedUpdates(callback: (arg?: any) => void, arg?: any): void;

	export const Children: {
		map<T extends preact.ComponentChild, R>(children: T | T[], fn: (child: T, i: number, array: T[]) => R): R[];
		forEach<T extends preact.ComponentChild>(children: T | T[], fn: (child: T, i: number, array: T[]) => void): void;
		count: (children: preact.ComponentChildren) => number;
		only: (children: preact.ComponentChildren) => preact.ComponentChild;
		toArray: (children: preact.ComponentChildren) => preact.VNode<{}>[];
	}
}
