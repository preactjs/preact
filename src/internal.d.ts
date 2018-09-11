export interface FunctionalComponent<P> extends preact.FunctionalComponent<P> {
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

export interface VNode<P> extends preact.VNode<P> {
	tag: string | ComponentFactory<P> | null;
	_children?: Array<VNode> | null;
	_el?: PreactElement | null;
	_component?: Component | null;
}

export interface Component<P = {}, S = {}> extends preact.Component<P, S> {
	base?: PreactElement;

	_dirty: boolean;
	_renderCallbacks: Array<() => void>;
	_vnode?: VNode<P> | null;
	_nextState?: S | null;
	_previousVTree?: VNode;
	_ancestorComponent?: Component<any, any>;
	_processingException?: Component<any, any>;
	_constructor: preact.ComponentFactory;
}
