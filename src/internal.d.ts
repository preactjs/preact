import * as preact from "./index";

export interface Options extends preact.Options {
	/** Attach a hook that is invoked before render, mainly to check the arguments. */
	_root?(vnode: preact.ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment): void;
	/** Attach a hook that is invoked before a vnode is diffed. */
	_diff?(vnode: VNode): void;
	/** Attach a hook that is invoked after a tree was mounted or was updated. */
	_commit?(vnode: VNode): void;
	/** Attach a hook that is invoked before a vnode has rendered. */
	_render?(vnode: VNode): void;
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
