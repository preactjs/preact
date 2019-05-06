import * as hooksRoot from '../../hooks';
import { VNode, PreactElement } from '../../src/internal';
import { Component, createContext, createRef, Fragment, ComponentChildren, ComponentChild, FunctionComponent } from '../../src';
import { FunctionalComponent } from 'preact';
import { ForwardFn } from './internal';

export = compat;
export as namespace compat;

declare namespace compat {
  export import hooks = hooksRoot;
  // export import Component = _Component;

  const version: string;

  function createPortal(vnode: VNode, container: PreactElement): VNode<any>;

  function createElement(type: VNode["type"], props?: any, Children?: ComponentChildren): VNode<any>;

  function cloneElement (element: VNode<any>): VNode<any>;

  function render(vnode: VNode<any>, parent: PreactElement, callback?: () => void): Component | null;

  function unmountComponentAtNode(container: Element | Document | ShadowRoot | DocumentFragment): boolean;

  function createFactory(type: VNode["type"]): VNode<{}>;

  function isValidElement(element: any): boolean;

  function findDOMNode(component: Component): PreactElement | null;

  interface PureComponent<P = {}, S = {}> extends Component {
    isPureReactComponenet: boolean;
  }

  function memo<P = {}>(component: FunctionalComponent<P>, comparer?: (prev: P, next: P) => boolean): FunctionComponent<P>;

  function forwardRef<P = {}>(fn: ForwardFn<P, any>): FunctionalComponent<P>;

  function unstable_batchedUpdates(callback: (arg?: any) => void, arg?: any): void;


  interface Children {
    map<T extends ComponentChild, R>(children: T | T[], fn: (child: T, i: number, array: T[]) => R): R[];
    forEach<T extends ComponentChild>(children: T | T[], fn: (child: T, i: number, array: T[]) => void): void;
    count: (children: ComponentChildren) => number;
    only: (children: ComponentChildren) => ComponentChild;
    toArray: (children: ComponentChildren) => VNode<{}>[];
  }
}
