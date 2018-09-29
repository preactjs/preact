export interface FunctionalComponent<P = {}> extends preact.FunctionalComponent<P> {
	// Define getDerivedStateFromProps as undefined on FunctionalComponent
	// to get rid of some errors in `diff()`
	getDerivedStateFromProps?: undefined;
}

// Redefine ComponentFactory using our new internal FunctionalComponent interface above
export type ComponentFactory<P> = preact.ComponentConstructor<P> | FunctionalComponent<P>;

export interface PreactElement extends Element {
	_previousVTree?: VNode<any>

	// Preact uses this attribute to detect SVG nodes
	ownerSVGElement?: SVGElement;

	style?: HTMLElement["style"]; // From HTMLElement

	data?: string | number; // From Text node
}

export interface VNode<P = {}> extends preact.VNode<P> {
	// Redefine type here using our internal ComponentFactory type
	type: string | ComponentFactory<P> | number | null;
	_children?: Array<VNode> | null;
	/**
	 * Only set when the vnode has a single child, even for Fragments. For vnodes
	 * with more children this property will remain `null`.
	 */
	_el?: PreactElement | null;
	/**
	 * The last dom sibling, if the vnode returned more than one child. This
	 * property is also used as a cursor when diffing children.
	 */
	_lastSibling?: PreactElement | null;
	_component?: Component | null;
}

export interface Component<P = {}, S = {}> extends preact.Component<P, S> {
	base?: PreactElement;

	_dirty: boolean;
	_renderCallbacks: Array<() => void>;
	_vnode?: VNode<P> | null;
	_nextState?: S | null;
	/**
	 * Pointer to the parent dom node. This is only needed for top-level Fragment
	 * components or array returns.
	 */
	_parent?: PreactElement;
	/**
	 * Pointer to the parent vnode. During child reconciliation and ordering we
	 * use the parent vnodes `_lastSibling` as the current position among sibling
	 * vnodes.
	 */
	_parentVNode?: VNode;
	_previousVTree?: VNode;
	_ancestorComponent?: Component<any, any>;
	_processingException?: Component<any, any>;
	_constructor: preact.ComponentFactory<P>;
}

/**
 * Global hooks into our renderer
 */
export interface Options {
	enableProfiling?: boolean;
	commitRoot?(vnode: VNode): void;
	beforeUnmount?(vnode: VNode): void;
}
