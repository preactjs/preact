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
	_el?: PreactElement | Text | null;
	/**
	 * The last dom sibling, if the vnode returned more than one child. This
	 * property is also used as a cursor when diffing children.
	 */
	_lastSibling?: PreactElement | null;
	_component?: Component | null;

	// Profiling
	startTime: number;
	duration: number;
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

// DEVTOOLS

export interface DevtoolsInjectOptions {
	/** 1 = DEV, 0 = production */
	bundleType: 1 | 0;
	/** The devtools enable different features for different versions of react */
	version: string;
	/** Informative string, currently unused in the devtools  */
	rendererPackageName: string;
	/** Find the root dom node of a vnode */
	findHostInstanceByFiber(vnode: VNode): HTMLElement | null;
	/** Find the closest vnode given a dom node */
	findFiberByHostInstance(instance: HTMLElement): VNode | null;
}

export interface DevtoolsUpdater {
	setState(objOrFn: any): void;
	forceUpdate(): void;
	setInState(path: Array<string | number>, value: any): void;
	setInProps(): void;
	setInContext(): void;
}

export interface DevtoolData {
	nodeType: "Composite" | "Native" | "Wrapper" | "Text";
	// Component tag
	type: any;
	name: string;
	ref: any;
	key: string | number;
	updater: DevtoolsUpdater | null;
	text: string | number | null;
	state: any;
	props: any;
	children: VNode[] | string | number | null;
	publicInstance: PreactElement | HTMLElement | Text;
}

export interface DevtoolsWindow extends Window {
	/**
	 * If the devtools extension is installed it will inject this object into
	 * the dom. This hook handles all communications between preact and the
	 * devtools panel.
	 */
	__REACT_DEVTOOLS_GLOBAL_HOOK__?: {
		_renderers: Record<string, object>;
		on(ev: string, listener: () => void): void;
		emit(ev: string, object): void;
		helpers: Record<string, any>;
		getFiberRoots(rendererId: string): any;
		inject(config: DevtoolsInjectOptions): string;
		onCommitFiberRoot(rendererId: string, root: VNode): void;
		onCommitFiberUnmount(rendererId: string, fiber: VNode): void;
	}
}
