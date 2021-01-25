export = preact;
export as namespace preact;

import { JSXInternal } from './jsx';

declare namespace preact {
	export import JSX = JSXInternal;

	//
	// Preact Virtual DOM
	// -----------------------------------

	interface VNode<P = {}> {
		type: ComponentType<P> | string;
		props: P & { children: ComponentChildren };
		key: Key;
		/**
		 * ref is not guaranteed by React.ReactElement, for compatibility reasons
		 * with popular react libs we define it as optional too
		 */
		ref?: Ref<any> | null;
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

	type RefObject<T> = { current: T | null };
	type RefCallback<T> = (instance: T | null) => void;
	type Ref<T> = RefObject<T> | RefCallback<T>;

	type ComponentChild =
		| VNode<any>
		| object
		| string
		| number
		| boolean
		| null
		| undefined;
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

	type RenderableProps<P, RefType = any> = P &
		Readonly<Attributes & { children?: ComponentChildren; ref?: Ref<RefType> }>;

	type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
	type ComponentFactory<P = {}> = ComponentType<P>;

	type ComponentProps<
		C extends ComponentType<any> | keyof JSXInternal.IntrinsicElements
	> = C extends ComponentType<infer P>
		? P
		: C extends keyof JSXInternal.IntrinsicElements
		? JSXInternal.IntrinsicElements[C]
		: never;

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
		contextType?: Context<any>;
		getDerivedStateFromProps?(
			props: Readonly<P>,
			state: Readonly<S>
		): Partial<S> | null;
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
		shouldComponentUpdate?(
			nextProps: Readonly<P>,
			nextState: Readonly<S>,
			nextContext: any
		): boolean;
		componentWillUpdate?(
			nextProps: Readonly<P>,
			nextState: Readonly<S>,
			nextContext: any
		): void;
		getSnapshotBeforeUpdate?(oldProps: Readonly<P>, oldState: Readonly<S>): any;
		componentDidUpdate?(
			previousProps: Readonly<P>,
			previousState: Readonly<S>,
			snapshot: any
		): void;
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
		static getDerivedStateFromProps?(
			props: Readonly<object>,
			state: Readonly<object>
		): object | null;
		static getDerivedStateFromError?(error: any): object | null;

		state: Readonly<S>;
		props: RenderableProps<P>;
		context: any;
		base?: Element | Text;

		// From https://github.com/DefinitelyTyped/DefinitelyTyped/blob/e836acc75a78cf0655b5dfdbe81d69fdd4d8a252/types/react/index.d.ts#L402
		// // We MUST keep setState() as a unified signature because it allows proper checking of the method return type.
		// // See: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18365#issuecomment-351013257
		setState<K extends keyof S>(
			state:
				| ((
						prevState: Readonly<S>,
						props: Readonly<P>
				  ) => Pick<S, K> | Partial<S> | null)
				| (Pick<S, K> | Partial<S> | null),
			callback?: () => void
		): void;

		forceUpdate(callback?: () => void): void;

		abstract render(
			props?: RenderableProps<P>,
			state?: Readonly<S>,
			context?: any
		): ComponentChild;
	}

	//
	// Preact createElement
	// -----------------------------------

	function createElement(
		type: string,
		props:
			| (JSXInternal.HTMLAttributes &
					JSXInternal.SVGAttributes &
					Record<string, any>)
			| null,
		...children: ComponentChildren[]
	): VNode<any>;
	function createElement<P>(
		type: ComponentType<P>,
		props: (Attributes & P) | null,
		...children: ComponentChildren[]
	): VNode<any>;
	namespace createElement {
		export import JSX = JSXInternal;
	}

	function h(
		type: string,
		props:
			| (JSXInternal.HTMLAttributes &
					JSXInternal.SVGAttributes &
					Record<string, any>)
			| null,
		...children: ComponentChildren[]
	): VNode<any>;
	function h<P>(
		type: ComponentType<P>,
		props: (Attributes & P) | null,
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
	function hydrate(
		vnode: ComponentChild,
		parent: Element | Document | ShadowRoot | DocumentFragment
	): void;
	function cloneElement(
		vnode: VNode<any>,
		props?: any,
		...children: ComponentChildren[]
	): VNode<any>;
	function cloneElement<P>(
		vnode: VNode<P>,
		props?: any,
		...children: ComponentChildren[]
	): VNode<P>;

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
	interface Options {
		/** Attach a hook that is invoked whenever a VNode is created. */
		vnode?(vnode: VNode): void;
		/** Attach a hook that is invoked immediately before a vnode is unmounted. */
		unmount?(vnode: VNode): void;
		/** Attach a hook that is invoked after a vnode has rendered. */
		diffed?(vnode: VNode): void;
		event?(e: Event): any;
		requestAnimationFrame?: typeof requestAnimationFrame;
		debounceRendering?(cb: () => void): void;
		useDebugValue?(value: string | number): void;
		_addHookName?(name: string | number): void;
		__suspenseDidResolve?(vnode: VNode, cb: () => void): void;
		// __canSuspenseResolve?(vnode: VNode, cb: () => void): void;
	}

	const options: Options;

	//
	// Preact helpers
	// -----------------------------------
	function createRef<T = any>(): RefObject<T>;
	function toChildArray(
		children: ComponentChildren
	): Array<VNode | string | number>;
	function isValidElement(vnode: any): vnode is VNode;

	//
	// Context
	// -----------------------------------
	interface Consumer<T>
		extends FunctionComponent<{
			children: (value: T) => ComponentChildren;
		}> {}
	interface PreactConsumer<T> extends Consumer<T> {}

	interface Provider<T>
		extends FunctionComponent<{
			value: T;
			children: ComponentChildren;
		}> {}
	interface PreactProvider<T> extends Provider<T> {}

	interface Context<T> {
		Consumer: Consumer<T>;
		Provider: Provider<T>;
		displayName?: string;
	}
	interface PreactContext<T> extends Context<T> {}

	function createContext<T>(defaultValue: T): Context<T>;
}
