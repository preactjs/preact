import * as preact from "./index";

import { Component as PreactComponent } from './internal';

/**
 * The type of arguments passed to a Hook function. While this type is not
 * strictly necessary, they are given a type name to make it easier to read
 * the following types and trace the flow of data.
 */
export type HookArgs = any;

/**
 * The return type of a Hook function. While this type is not
 * strictly necessary, they are given a type name to make it easier to read
 * the following types and trace the flow of data.
 */
export type HookReturnValue = any;

/** The public function a user invokes to use a Hook */
export type Hook = (...args: HookArgs[]) => HookReturnValue;

// Hook tracking
export interface ComponentHooks {
	/** The list of hooks a component uses */
	_list: HookState[];
	/** List of Effects to be invoked after the next frame is rendered */
	_pendingEffects: EffectHookState[];
	/** List of Effects to be invoked at the end of the current render */
	_pendingLayoutEffects: EffectHookState[];
}

export type HookState = EffectHookState | MemoHookState | ReducerHookState;

export type Effect = () => (void | Cleanup);
export type Cleanup = () => void;

export interface EffectHookState {
	_value?: Effect;
	_args?: any[];
	_cleanup?: Cleanup;
}

export interface MemoHookState {
	_value?: any;
	_args?: any[];
	_callback?: () => any;
}

export interface ReducerHookState {
	_value?: any;
	_component?: Component;
}

export interface Options extends preact.Options {
	/** Attach a hook that is invoked before render, mainly to check the arguments. */
	_root?(vnode: preact.ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment): void;
	/** Attach a hook that is invoked before a vnode is diffed. */
	_diff?(vnode: VNode): void;
	/** Attach a hook that is invoked after a tree was mounted or was updated. */
	_commit?(vnode: VNode): void;
	/** Attach a hook that is invoked before a hook's state is queried. */
	_hook?(component: Component): void;
	/** Attach a hook that is invoked after an error is caught in a component but before calling lifecycle hooks */
	_catchError(error: any, vnode: VNode, oldVNode: VNode | undefined): void;
}

export interface FunctionalComponent<P = {}> extends preact.FunctionComponent<P> {
	// Define getDerivedStateFromProps as undefined on FunctionalComponent
	// to get rid of some errors in `diff()`
	getDerivedStateFromProps?: undefined;
}

// Redefine ComponentFactory using our new internal FunctionalComponent interface above
export type ComponentFactory<P> = preact.ComponentClass<P> | FunctionalComponent<P>;

export interface PreactElement extends HTMLElement {
	_children?: VNode<any> | null;
	/** Event listeners to support event delegation */
	_listeners: Record<string, (e: Event) => void>;

	// Preact uses this attribute to detect SVG nodes
	ownerSVGElement?: SVGElement | null;

	// style: HTMLElement["style"]; // From HTMLElement

	data?: string | number; // From Text node
}

export interface VNode<P = {}> extends preact.VNode<P> {
	// Redefine type here using our internal ComponentFactory type
	type: string | ComponentFactory<P> | null;
	_children: Array<VNode<any>> | null;
	_parent: VNode | null;
	_depth: number | null;
	/**
	 * The [first (for Fragments)] DOM child of a VNode
	 */
	_dom: PreactElement | Text | null;
	/**
	 * The last dom child of a Fragment, or components that return a Fragment
	 */
	_lastDomChild: PreactElement | Text | null;
	_component: Component | null;
	constructor: undefined;
}

export interface Component<P = {}, S = {}> extends preact.Component<P, S> {
	constructor: preact.ComponentType<P>;
	state: S; // Override Component["state"] to not be readonly for internal use, specifically Hooks
	base?: PreactElement;
	__hooks?: ComponentHooks;

	_dirty: boolean;
	_renderCallbacks: Array<() => void>;
	_context?: any;
	_vnode?: VNode<P> | null;
	_nextState?: S | null;
	/** Only used in the devtools to later dirty check if state has changed */
	_prevState?: S | null;
	/**
	 * Pointer to the parent dom node. This is only needed for top-level Fragment
	 * components or array returns.
	 */
	_parentDom?: PreactElement | null;
	_processingException?: Component<any, any> | null;
	_pendingError?: Component<any, any> | null;
}

export interface PreactContext extends preact.Context<any> {
	_id: string;
	_defaultValue: any;
}
