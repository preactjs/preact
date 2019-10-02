export = preact;
export as namespace preact;

import { JSXInternal } from "./jsx";

declare namespace preact {
	export import JSX = JSXInternal;

	//
	// Preact Virtual DOM
	// -----------------------------------

	interface VNode<P = {}> {
		type: ComponentType<P> | string | null;
		props: P & { children: ComponentChildren } | string | number | null;
		key: Key;
		ref: Ref<any> | null;
		/**
		 * The time this `vnode` started rendering. Will only be set when
		 * the devtools are attached.
		 * Default value: `0`
		 */
		startTime?: number;
		/**
		 * The time that the rendering of this `vnode` was completed. Will only be
		 * set when the devtools are attached.
		 * Default value: `-1`
		 */
		endTime?: number;
	}

	//
	// Preact Component interface
	// -----------------------------------

	type Key = string | number | any;

	type RefObject<T> = { current?: T | null }
	type RefCallback<T> = (instance: T | null) => void;
	type Ref<T> = RefObject<T> | RefCallback<T>;

	type ComponentChild = VNode<any> | object | string | number | boolean | null | undefined;
	type ComponentChildren = ComponentChild[] | ComponentChild;

	interface Attributes {
		key?: Key;
		jsx?: boolean;
	}

	interface ClassAttributes<T> extends Attributes {
		ref?: Ref<T>;
	}

	interface PreactDOMAttributes {
		children?: ComponentChildren;
		dangerouslySetInnerHTML?: {
			__html: string;
		};
	}

	type RenderableProps<P, RefType = any> = Readonly<
		P & Attributes & { children?: ComponentChildren; ref?: Ref<RefType> }
	>;

	type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
	type ComponentFactory<P = {}> = ComponentType<P>;

	interface FunctionComponent<P = {}> {
		(props: RenderableProps<P>, context?: any): VNode<any> | null;
		displayName?: string;
		defaultProps?: Partial<P>;
	}
	interface FunctionalComponent<P = {}> extends FunctionComponent<P> {}

	interface ComponentClass<P = {}, S = {}> {
		new (props: P, context?: any): Component<P, S>;
		displayName?: string;
		defaultProps?: Partial<P>;
		getDerivedStateFromProps?(props: Readonly<P>, state: Readonly<S>): Partial<S> | null;
		getDerivedStateFromError?(error: any): Partial<S> | null;
	}
	interface ComponentConstructor<P = {}, S = {}> extends ComponentClass<P, S> {}

	// Type alias for a component instance considered generally, whether stateless or stateful.
	type AnyComponent<P = {}, S = {}> = FunctionComponent<P> | Component<P, S>;

	interface Component<P = {}, S = {}> {
		componentWillMount?(): void;
		componentDidMount?(): void;
		componentWillUnmount?(): void;
		getChildContext?(): object;
		componentWillReceiveProps?(nextProps: Readonly<P>, nextContext: any): void;
		shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): boolean;
		componentWillUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): void;
		getSnapshotBeforeUpdate?(oldProps: Readonly<P>, oldState: Readonly<S>): any;
		componentDidUpdate?(previousProps: Readonly<P>, previousState: Readonly<S>, snapshot: any): void;
		componentDidCatch?(error: any, errorInfo: any): void;
	}

	abstract class Component<P, S> {
		constructor(props?: P, context?: any);

		static displayName?: string;
		static defaultProps?: any;
		static contextType?: Context<any>;

		// Static members cannot reference class type parameters. This is not
		// supported in TypeScript. Reusing the same type arguments from `Component`
		// will lead to an impossible state where one cannot satisfy the type
		// constraint under no circumstances, see #1356.In general type arguments
		// seem to be a bit buggy and not supported well at the time of this
		// writing with TS 3.3.3333.
		static getDerivedStateFromProps?(props: Readonly<object>, state: Readonly<object>): object | null;
		static getDerivedStateFromError?(error: any): object | null;

		state: Readonly<S>;
		props: RenderableProps<P>;
		context: any;
		base?: Element | Text;

		// From https://github.com/DefinitelyTyped/DefinitelyTyped/blob/e836acc75a78cf0655b5dfdbe81d69fdd4d8a252/types/react/index.d.ts#L402
		// // We MUST keep setState() as a unified signature because it allows proper checking of the method return type.
		// // See: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18365#issuecomment-351013257
		setState<K extends keyof S>(
			state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | Partial<S> | null)) | (Pick<S, K> | Partial<S> | null),
			callback?: () => void
		): void;

		forceUpdate(callback?: () => void): void;

		abstract render(props?: RenderableProps<P>, state?: Readonly<S>, context?: any): ComponentChild;
	}

	//
	// Preact createElement
	// -----------------------------------

	function createElement(
		type: string,
		props: JSXInternal.HTMLAttributes & JSXInternal.SVGAttributes & Record<string, any> | null,
		...children: ComponentChildren[]
	): VNode<any>;
	function createElement<P>(
		type: ComponentType<P>,
		props: Attributes & P | null,
		...children: ComponentChildren[]
	): VNode<any>;
	namespace createElement {
		export import JSX = JSXInternal;
	}

	function h(
		type: string,
		props: JSXInternal.HTMLAttributes & JSXInternal.SVGAttributes & Record<string, any> | null,
		...children: ComponentChildren[]
	): VNode<any>;
	function h<P>(
		type: ComponentType<P>,
		props: Attributes & P | null,
		...children: ComponentChildren[]
	): VNode<any>;
	namespace h {
		export import JSX = JSXInternal;
	}

	//
	// Preact render
	// -----------------------------------

	function render(
		vnode: ComponentChild,
		parent: Element | Document | ShadowRoot | DocumentFragment,
		replaceNode?: Element | Text
	): void;
	function hydrate(vnode: ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment): void;
	function cloneElement(vnode: JSX.Element, props?: any, ...children: ComponentChildren[]): JSX.Element;

	//
	// Preact Built-in Components
	// -----------------------------------

	// TODO: Revisit what the public type of this is...
	const Fragment: ComponentClass<{}, {}>;

	//
	// Preact options
	// -----------------------------------

	/**
	 * Global options for preact
	 */
	interface Options {
		/** Attach a hook that is invoked whenever a VNode is created. */
		vnode?(vnode: VNode): void;
		/** Attach a hook that is invoked immediately before a vnode is unmounted. */
		unmount?(vnode: VNode): void;
		/** Attach a hook that is invoked after a vnode has rendered. */
		diffed?(vnode: VNode): void;
		event?(e: Event): void;
		requestAnimationFrame?: typeof requestAnimationFrame;
		debounceRendering?(cb: () => void): void;
		useDebugValue?(value: string | number): void;
	}

	const options: Options;

	//
	// Preact helpers
	// -----------------------------------
	function createRef<T = any>(): RefObject<T>;
	function toChildArray(children: ComponentChildren): Array<VNode | null>;
	function isValidElement(vnode: any): vnode is VNode;

	//
	// Context
	// -----------------------------------
	interface Consumer<T> extends FunctionComponent<{
		children: (value: T) => ComponentChildren
	}> {}
	interface PreactConsumer<T> extends Consumer<T> {}

	interface Provider<T> extends FunctionComponent<{
		value: T,
		children: ComponentChildren
	}> {}
	interface PreactProvider<T> extends Provider<T> {}

	interface Context<T> {
		Consumer: Consumer<T>;
		Provider: Provider<T>;
	}
	interface PreactContext<T> extends Context<T> {}

	function createContext<T>(defaultValue: T): Context<T>;
}

import { PreactContext, Ref as PreactRef } from "../..";

type Inputs = ReadonlyArray<unknown>;


export type StateUpdater<S> = (value: S | ((prevState: S) => S)) => void;
/**
 * Returns a stateful value, and a function to update it.
 * @param initialState The initial value (or a function that returns the initial value)
 */
export function useState<S>(initialState: S | (() => S)): [S, StateUpdater<S>];


export type Reducer<S, A> = (prevState: S, action: A) => S;
/**
 * An alternative to `useState`.
 *
 * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
 * multiple sub-values. It also lets you optimize performance for components that trigger deep
 * updates because you can pass `dispatch` down instead of callbacks.
 * @param reducer Given the current state and an action, returns the new state
 * @param initialState The initial value to store as state
 */
export function useReducer<S, A>(reducer: Reducer<S, A>, initialState: S): [S, (action: A) => void];

/**
 * An alternative to `useState`.
 *
 * `useReducer` is usually preferable to `useState` when you have complex state logic that involves
 * multiple sub-values. It also lets you optimize performance for components that trigger deep
 * updates because you can pass `dispatch` down instead of callbacks.
 * @param reducer Given the current state and an action, returns the new state
 * @param initialArg The initial argument to pass to the `init` function
 * @param init A function that, given the `initialArg`, returns the initial value to store as state
 */
export function useReducer<S, A, I>(reducer: Reducer<S, A>, initialArg: I, init: (arg: I) => S): [S, (action: A) => void];


type PropRef<T> = { readonly current?: T; }
type Ref<T> = { current: T; }

/**
 * `useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `useRef()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 */
export function useRef<T>(initialValue: T): Ref<T>;

/**
 * `useRef` without an initial value is the special case handling `ref` props.
 * If you want a non prop-based, mutable ref, you can explicitly give it an initial value of undefined/null/etc.
 * You should explicitly set the type parameter for the expected ref value to either a DOM Element like `HTMLInputElement` or a `Component`
 */
export function useRef<T = unknown>(): PropRef<T>;


type EffectCallback = () => (void | (() => void));
/**
 * Accepts a function that contains imperative, possibly effectful code.
 * The effects run after browser paint, without blocking it.
 *
 * @param effect Imperative function that can return a cleanup function
 * @param inputs If present, effect will only activate if the values in the list change (using ===).
 */
export function useEffect(effect: EffectCallback, inputs?: Inputs): void;

type CreateHandle = () => object;

/**
 * @param ref The ref that will be mutated
 * @param create The function that will be executed to get the value that will be attached to
 * ref.current
 * @param inputs If present, effect will only activate if the values in the list change (using ===).
 */
export function useImperativeHandle<T, R extends T>(ref: PreactRef<T>, create: () => R, inputs?: Inputs): void;

/**
 * Accepts a function that contains imperative, possibly effectful code.
 * Use this to read layout from the DOM and synchronously re-render.
 * Updates scheduled inside `useLayoutEffect` will be flushed synchronously, after all DOM mutations but before the browser has a chance to paint.
 * Prefer the standard `useEffect` hook when possible to avoid blocking visual updates.
 *
 * @param effect Imperative function that can return a cleanup function
 * @param inputs If present, effect will only activate if the values in the list change (using ===).
 */
export function useLayoutEffect(effect: EffectCallback, inputs?: Inputs): void;

/**
 * Returns a memoized version of the callback that only changes if one of the `inputs`
 * has changed (using ===).
 */
export function useCallback<T extends Function>(callback: T, inputs: Inputs): T;

/**
 * Pass a factory function and an array of inputs.
 * useMemo will only recompute the memoized value when one of the inputs has changed.
 * This optimization helps to avoid expensive calculations on every render.
 * If no array is provided, a new value will be computed whenever a new function instance is passed as the first argument.
 */
export function useMemo<T>(factory: () => T, inputs?: Inputs): T;

/**
 * Returns the current context value, as given by the nearest context provider for the given context.
 * When the provider updates, this Hook will trigger a rerender with the latest context value.
 *
 * @param context The context you want to use
 */
export function useContext<T>(context: PreactContext<T>): T;

/**
 * Customize the displayed value in the devtools panel.
 *
 * @param value Custom hook name or object that is passed to formatter
 * @param formatter Formatter to modify value before sending it to the devtools
 */
export function useDebugValue<T>(value: T, formatter?: (value: T) => string | number): void;


