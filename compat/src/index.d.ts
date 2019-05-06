import * as _hooks from '../../hooks';
import { VNode, PreactElement } from '../../src/internal';
import * as preact from '../../src';
import { ForwardFn } from './internal';

export = compat;
export as namespace compat;
declare namespace compat {
  export import hooks = _hooks;
  export import Component = preact.Component;
  export import createContext = preact.createContext;
  export import createRef = preact.createRef;
  export import Fragment = preact.Fragment;
  export import createElement = preact.createElement
  export import cloneElement = preact.cloneElement

  export const version: string;

  export function createPortal(vnode: VNode, container: PreactElement): VNode<any>;

  function render(vnode: VNode<any>, parent: PreactElement, callback?: () => void): Component | null;

  function hydrate(vnode: VNode<any>, parent: PreactElement, callback?: () => void): Component | null;

  function unmountComponentAtNode(container: Element | Document | ShadowRoot | DocumentFragment): boolean;

  function createFactory(type: VNode["type"]): VNode<{}>;

  function isValidElement(element: any): boolean;

  function findDOMNode(component: preact.Component): PreactElement | null;

  interface PureComponent<P = {}, S = {}> extends preact.Component {
    isPureReactComponenet: boolean;
  }

  function memo<P = {}>(component: preact.FunctionalComponent<P>, comparer?: (prev: P, next: P) => boolean): preact.FunctionComponent<P>;

  function forwardRef<P = {}>(fn: ForwardFn<P, any>): preact.FunctionalComponent<P>;

  function unstable_batchedUpdates(callback: (arg?: any) => void, arg?: any): void;


  interface Children {
    map<T extends preact.ComponentChild, R>(children: T | T[], fn: (child: T, i: number, array: T[]) => R): R[];
    forEach<T extends preact.ComponentChild>(children: T | T[], fn: (child: T, i: number, array: T[]) => void): void;
    count: (children: preact.ComponentChildren) => number;
    only: (children: preact.ComponentChildren) => preact.ComponentChild;
    toArray: (children: preact.ComponentChildren) => VNode<{}>[];
  }
}
