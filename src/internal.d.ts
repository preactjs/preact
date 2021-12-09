import * as preact from './index';

export enum HookType {
	useState = 1,
	useReducer = 2,
	useEffect = 3,
	useLayoutEffect = 4,
	useRef = 5,
	useImperativeHandle = 6,
	useMemo = 7,
	useCallback = 8,
	useContext = 9,
	useErrorBoundary = 10,
	// Not a real hook, but the devtools treat is as such
	useDebugvalue = 11
}

export interface DevSource {
	fileName: string;
	lineNumber: number;
}

export interface Options extends preact.Options {
	/** Attach a hook that is invoked immediately before a vnode is unmounted. */
	unmount?(internal: Internal): void;
	/** Attach a hook that is invoked after a vnode has rendered. */
	diffed?(internal: Internal): void;
	/** Attach a hook that is invoked before render, mainly to check the arguments. */
	_root?(
		vnode: ComponentChild,
		parent: Element | Document | ShadowRoot | DocumentFragment
	): void;
	/** Attach a hook that is invoked before a vnode is diffed. */
	_diff?(internal: Internal, vnode?: VNode): void;
	/** Attach a hook that is invoked after a tree was mounted or was updated. */
	_commit?(internal: Internal, commitQueue: CommitQueue): void;
	/** Attach a hook that is invoked before a vnode has rendered. */
	_render?(internal: Internal): void;
	/** Attach a hook that is invoked before a hook's state is queried. */
	_hook?(component: Component, index: number, type: HookType): void;
	/** Bypass effect execution. Currenty only used in devtools for hooks inspection */
	_skipEffects?: boolean;
	/** Attach a hook that is invoked after an error is caught in a component but before calling lifecycle hooks */
	_catchError?(error: any, internal: Internal): void;
	_internal?(internal: Internal, vnode: VNode | string): void;
}

export type CommitQueue = Internal[];

// Redefine ComponentFactory using our new internal FunctionalComponent interface above
export type ComponentFactory<P> =
	| preact.ComponentClass<P>
	| FunctionalComponent<P>;

export type ComponentChild =
	| VNode<any>
	| string
	| number
	| boolean
	| null
	| undefined;
export type ComponentChildren = ComponentChild[] | ComponentChild;

export interface FunctionComponent<P = {}> extends preact.FunctionComponent<P> {
	// Internally, createContext uses `contextType` on a Function component to
	// implement the Consumer component
	contextType?: PreactContext;

	// Internally, createContext stores a ref to the context object on the Provider
	// Function component to help devtools
	_contextRef?: PreactContext;

	// Define these properties as undefined on FunctionComponent to get rid of
	// some errors in `diff()`
	getDerivedStateFromProps?: undefined;
	getDerivedStateFromError?: undefined;
}

export interface ComponentClass<P = {}> extends preact.ComponentClass<P> {
	_contextRef?: any;

	// Override public contextType with internal PreactContext type
	contextType?: PreactContext;
}

// Redefine ComponentType using our new internal FunctionComponent interface above
export type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;

export interface PreactElement extends HTMLElement {
	_children?: Internal<any> | null;
	/** Event listeners to support event delegation */
	_listeners?: Record<string, (e: Event) => void>;

	// Preact uses this attribute to detect SVG nodes
	ownerSVGElement?: SVGElement | null;

	// style: HTMLElement["style"]; // From HTMLElement

	data?: string | number; // From Text node
}

export type PreactNode = PreactElement | Text;

// We use the `current` property to differentiate between the two kinds of Refs so
// internally we'll define `current` on both to make TypeScript happy
type RefObject<T> = { current: T | null };
type RefCallback<T> = { (instance: T | null): void; current: undefined };
type Ref<T> = RefObject<T> | RefCallback<T>;

export interface VNode<P = {}> extends preact.VNode<P> {
	// Redefine type here using our internal ComponentType type
	type: string | ComponentType<P>;
	props: P & { children: ComponentChildren };
	/**
	 * Internal GUID for this VNode, used for fast equality checks.
	 * Note: h() allocates monotonic positive integer IDs, jsx() allocates negative.
	 * @private
	 */
	_vnodeId: number;
}

/**
 * An Internal is a persistent backing node within Preact's virtual DOM tree.
 * Think of an Internal like a long-lived VNode with stored data and tree linkages.
 */
export interface Internal<P = {}> {
	type: string | ComponentType<P>;
	/** The props object for Elements/Components, and the string contents for Text */
	props: (P & { children: ComponentChildren }) | string | number;
	key: any;
	ref: Ref<any> | null;

	/** Bitfield containing information about the Internal or its component. */
	flags: number;
	/** Polymorphic property to store extensions like hooks on */
	data: object;
	/** The function that triggers in-place re-renders for an internal */
	rerender: () => void;

	/** children Internal nodes */
	_children: Internal[];
	/** next sibling Internal node */
	_parent: Internal;
	/** most recent vnode ID */
	_vnodeId: number;
	/**
	 * Associated DOM element for the Internal, or its nearest realized descendant.
	 * For Fragments, this is the first DOM child.
	 */
	_dom: PreactNode;
	/** The component instance for which this is a backing Internal node */
	_component: Component | null;
	/** most recent context object passed down to this Internal from its parent */
	_context: any;
	/** This Internal's distance from the tree root */
	_depth: number | null;
	/** Callbacks to invoke when this internal commits */
	_commitCallbacks: Array<() => void>;
}

export interface Component<P = {}, S = {}> extends preact.Component<P, S> {
	// When component is functional component, this is reset to functional component
	constructor: ComponentType<P>;
	state: S; // Override Component["state"] to not be readonly for internal use, specifically Hooks
	_internal?: Internal<P> | null;
	_nextState?: S | null; // Only class components
	/** Only used in the devtools to later dirty check if state has changed */
	_prevState?: S | null;
}

export interface PreactContext extends preact.Context<any> {
	_id: string;
	_defaultValue: any;
}
