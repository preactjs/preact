import * as _hooks from '../../hooks';
import * as preact from '../../src';
import { ForwardFn } from './internal';
export * from './suspense';
import { Suspense, lazy } from './suspense';

export * from '../../hooks';
export import Component = preact.Component;
export import createContext = preact.createContext;
export import createRef = preact.createRef;
export import Fragment = preact.Fragment;
export import createElement = preact.createElement;
export import cloneElement = preact.cloneElement;
export import JSX = preact.JSX;

export declare const version: string;

export declare function createPortal(vnode: preact.VNode, container: Element): preact.VNode<any>;

export declare function render(vnode: preact.VNode<any>, parent: Element, callback?: () => void): Component | null;

export declare function hydrate(vnode: preact.VNode<any>, parent: Element, callback?: () => void): Component | null;

export declare function unmountComponentAtNode(container: Element | Document | ShadowRoot | DocumentFragment): boolean;

export declare function createFactory(type: preact.VNode["type"]): preact.VNode<{}>;

export declare function isValidElement(element: any): boolean;

export declare function findDOMNode(component: preact.Component): Element | null;

export declare interface PureComponent<P = {}, S = {}> extends preact.Component {
	isPureReactComponenet: boolean;
}

export declare function memo<P = {}>(component: preact.FunctionalComponent<P>, comparer?: (prev: P, next: P) => boolean): preact.FunctionComponent<P>;

export declare function forwardRef<P = {}>(fn: ForwardFn<P, any>): preact.FunctionalComponent<P>;

export declare function unstable_batchedUpdates(callback: (arg?: any) => void, arg?: any): void;


export declare interface Children {
	map<T extends preact.ComponentChild, R>(children: T | T[], fn: (child: T, i: number, array: T[]) => R): R[];
	forEach<T extends preact.ComponentChild>(children: T | T[], fn: (child: T, i: number, array: T[]) => void): void;
	count: (children: preact.ComponentChildren) => number;
	only: (children: preact.ComponentChildren) => preact.ComponentChild;
	toArray: (children: preact.ComponentChildren) => preact.VNode<{}>[];
}

declare const _default: {
	hooks: typeof _hooks,
	Component: typeof Component,
	createContext: typeof createContext,
	createRef: typeof createRef,
	Fragment: typeof Fragment,
	createElement: typeof createElement,
	cloneElement: typeof cloneElement,
	version: typeof version,
	createPortal: typeof createPortal,
	render: typeof render,
	hydrate: typeof render,
	unmountComponentAtNode: typeof unmountComponentAtNode,
	createFactory: typeof createFactory,
	isValidElement: typeof isValidElement,
	findDOMNode: typeof findDOMNode,
	PureComponent: PureComponent,
	memo: typeof memo,
	forwardRef: typeof forwardRef,
	unstable_batchedUpdates: typeof unstable_batchedUpdates,
	Children: Children,
	Suspense: typeof Suspense,
	lazy: typeof lazy,
};

export default _default;
