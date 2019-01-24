import * as preact from "./index";

export interface FunctionalComponent<P = {}> extends preact.FunctionalComponent<P> {
	// Define getDerivedStateFromProps as undefined on FunctionalComponent
	// to get rid of some errors in `diff()`
	getDerivedStateFromProps?: undefined;
}

// Redefine ComponentFactory using our new internal FunctionalComponent interface above
export type ComponentFactory<P> = preact.ComponentConstructor<P> | FunctionalComponent<P>;

export interface PreactElement extends HTMLElement {
	_prevVNode?: VNode<any>;
	/** Event listeners to support event delegation */
	_listeners: Record<string, (e: Event) => void>;

	// Preact uses this attribute to detect SVG nodes
	ownerSVGElement?: SVGElement;

	// style: HTMLElement["style"]; // From HTMLElement

	data?: string | number; // From Text node
}

export interface VNode<P = {}> extends preact.VNode<P> {
	// Redefine type here using our internal ComponentFactory type
	type: string | ComponentFactory<P> | null;
	_children?: Array<VNode> | null;
	/**
	 * The [first (for Fragments)] DOM child of a VNode
	 */
	_dom?: PreactElement | Text | null;
	/**
	 * The last dom child of a Fragment. This property is also used as a cursor
	 * when diffing children. Is the same as `_dom` for other kinds of VNodes.
	 */
	_lastDomChild?: PreactElement | null;
	_component?: Component | null;
}

export interface Component<P = {}, S = {}> extends preact.Component<P, S> {
	state: S; // Override Component["state"] to not be readonly for internal use, specifically Hooks
	base?: PreactElement;

	_dirty: boolean;
	_renderCallbacks: Array<() => void>;
	_vnode?: VNode<P> | null;
	_nextState?: S | null;
	/** Only used in the devtools to later dirty check if state has changed */
	_prevState?: S | null;
	/**
	 * Pointer to the parent dom node. This is only needed for top-level Fragment
	 * components or array returns.
	 */
	_parentDom?: PreactElement;
	/**
	 * Pointer to the parent vnode. During child reconciliation and ordering we
	 * use the parent vnodes `_lastDomChild` as the current position among sibling
	 * vnodes.
	 */
	_parentVNode?: VNode;
	_prevVNode?: VNode;
	_ancestorComponent?: Component<any, any>;
	_processingException?: Component<any, any>;
	_constructor: preact.ComponentFactory<P>;
}
