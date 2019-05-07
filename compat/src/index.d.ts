import * as preact from '../../src';
import { ForwardFn } from './internal';

export * from '../../hooks';
export import Component = preact.Component;
export import createContext = preact.createContext;
export import createRef = preact.createRef;
export import Fragment = preact.Fragment;
export import createElement = preact.createElement
export import cloneElement = preact.cloneElement

export const version: string;

export function createPortal(vnode: preact.VNode, container: Element | Element): preact.VNode<any>;

export function render(vnode: preact.VNode<any>, parent: Element, callback?: () => void): Component | null;

export function hydrate(vnode: preact.VNode<any>, parent: Element, callback?: () => void): Component | null;

export function unmountComponentAtNode(container: Element | Document | ShadowRoot | DocumentFragment): boolean;

export function createFactory(type: preact.VNode["type"]): preact.VNode<{}>;

export function isValidElement(element: any): boolean;

export function findDOMNode(component: preact.Component): Element | null;

export interface PureComponent<P = {}, S = {}> extends preact.Component {
  isPureReactComponenet: boolean;
}

export function memo<P = {}>(component: preact.FunctionalComponent<P>, comparer?: (prev: P, next: P) => boolean): preact.FunctionComponent<P>;

export function forwardRef<P = {}>(fn: ForwardFn<P, any>): preact.FunctionalComponent<P>;

export function unstable_batchedUpdates(callback: (arg?: any) => void, arg?: any): void;


export interface Children {
  map<T extends preact.ComponentChild, R>(children: T | T[], fn: (child: T, i: number, array: T[]) => R): R[];
  forEach<T extends preact.ComponentChild>(children: T | T[], fn: (child: T, i: number, array: T[]) => void): void;
  count: (children: preact.ComponentChildren) => number;
  only: (children: preact.ComponentChildren) => preact.ComponentChild;
  toArray: (children: preact.ComponentChildren) => preact.VNode<{}>[];
}
