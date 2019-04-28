import * as preact from "./index";

export interface FunctionalComponent<P = {}> extends preact.FunctionComponent<P> {
	// Define getDerivedStateFromProps as undefined on FunctionalComponent
	// to get rid of some errors in `diff()`
	getDerivedStateFromProps?: undefined;
}

// Redefine ComponentFactory using our new internal FunctionalComponent interface above
export type ComponentFactory<P> = preact.ComponentClass<P> | FunctionalComponent<P>;

export interface PreactElement extends HTMLElement {
	_prevVNode?: VNode<any> | null;
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
	_self: this;
	_children: Array<VNode> | null;
	/**
	 * The [first (for Fragments)] DOM child of a VNode
	 */
	_dom: PreactElement | Text | null;
	/**
	 * The last dom child of a Fragment, or components that return a Fragment
	 */
	_lastDomChild: PreactElement | Text | null;
	_component: Component | null;
}

export interface Component<P = {}, S = {}> extends preact.Component<P, S> {
	constructor: preact.ComponentType<P>;
	state: S; // Override Component["state"] to not be readonly for internal use, specifically Hooks
	base?: PreactElement | null;

	_dirty: boolean;
	_renderCallbacks: Array<() => void>;
	_context?: any;
	_vnode?: VNode<P> | null;
	_nextState?: S | null;
	/** Only used in the devtools to later dirty check if state has changed */
	_prevState?: S | null;
	_depth?: number;
	/**
	 * Pointer to the parent dom node. This is only needed for top-level Fragment
	 * components or array returns.
	 */
	_parentDom?: PreactElement | null;
	_prevVNode?: VNode | null;
	_ancestorComponent?: Component<any, any>;
	_processingException?: Component<any, any> | null;
	_pendingError?: Component<any, any> | null;
}

export interface PreactContext extends preact.Context<any> {
	_id: string;
	_defaultValue: any;
}
