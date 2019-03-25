export = preact;
export as namespace preact;

import "./jsx";

declare namespace preact {
	//
	// Preact Virtual DOM
	// -----------------------------------

	interface VNode<P = {}> {
		type: ComponentFactory<P> | string | null;
		props: P & { children: ComponentChildren } | null;
		text: string | number | null;
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

	type ComponentFactory<P = {}> = ComponentConstructor<P> | FunctionalComponent<P>;

	interface FunctionalComponent<P = {}> {
		(props: RenderableProps<P>, context?: any): VNode<any> | null;
		displayName?: string;
		defaultProps?: Partial<P>;
	}

	interface ComponentConstructor<P = {}, S = {}> {
		new (props: P, context?: any): Component<P, S>;
		displayName?: string;
		defaultProps?: Partial<P>;
		getDerivedStateFromProps?(props: Readonly<P>, state: Readonly<S>): Partial<S>;
		getDerivedStateFromError?(error: any): Partial<S>;
	}

	// Type alias for a component instance considered generally, whether stateless or stateful.
	type AnyComponent<P = {}, S = {}> = FunctionalComponent<P> | Component<P, S>;

	interface Component<P = {}, S = {}> {
		componentWillMount?(): void;
		componentDidMount?(): void;
		componentWillUnmount?(): void;
		getChildContext?(): object;
		componentWillReceiveProps?(nextProps: Readonly<P>, nextContext: any): void;
		shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): boolean;
		componentWillUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): void;
		getSnapshotBeforeUpdate?(oldProps: Readonly<P>, oldState: Readonly<S>): any;
		componentDidUpdate?(previousProps: Readonly<P>, previousState: Readonly<S>, previousContext: any): void;
		componentDidCatch?(error: any): void;
	}

	abstract class Component<P, S> {
		constructor(props?: P, context?: any);

		static displayName?: string;
		static defaultProps?: any;
		static contextType?: PreactContext<any>;

		// Static members cannot reference class type parameters. This is not
		// supported in TypeScript. Reusing the same type arguments from `Component`
		// will lead to an impossible state where one cannot satisfy the type
		// constraint under no circumstances, see #1356.In general type arguments
		// seem to be a bit buggy and not supported well at the time of this
		// writing with TS 3.3.3333.
		static getDerivedStateFromProps?(props: Readonly<object>, state: Readonly<object>): object;
		static getDerivedStateFromError?(error: any): object;

		state: Readonly<S>;
		props: RenderableProps<P>;
		context: any;
		base?: HTMLElement;

		// From https://github.com/DefinitelyTyped/DefinitelyTyped/blob/e836acc75a78cf0655b5dfdbe81d69fdd4d8a252/types/react/index.d.ts#L402
		// // We MUST keep setState() as a unified signature because it allows proper checking of the method return type.
		// // See: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18365#issuecomment-351013257
		// // Also, the ` | S` allows intellisense to not be dumbisense
		setState<K extends keyof S>(
			state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null),
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
		props: JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any> | null,
		...children: ComponentChildren[]
	): VNode<any>;
	function createElement<P>(
		type: ComponentFactory<P>,
		props: Attributes & P | null,
		...children: ComponentChildren[]
	): VNode<any>;

	const h: typeof createElement;

	//
	// Preact render
	// -----------------------------------

	function render(vnode: ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment): void
	function hydrate(vnode: ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment): void
	function cloneElement(vnode: JSX.Element, props: any, ...children: ComponentChildren[]): JSX.Element;

	//
	// Preact Built-in Components
	// -----------------------------------

	// TODO: Revisit what the public type of this is...
	const Fragment: ComponentConstructor<{}, {}>;

	//
	// Preact options
	// -----------------------------------

	/**
	 * Global options for preact
	 */
	interface Options {
		/** Attach a hook that is invoked whenever a VNode is created */
		vnode(vnode: VNode): void;
		/** Attach a hook that is invoked after a tree was mounted or was updated. */
		commit?(vnode: VNode): void;
		/** Attach a hook that is invoked immediately before a component is unmounted. */
		unmount?(vnode: VNode): void;
		/** Attach a hook that is invoked before a vnode is diffed */
		diff?(vnode: VNode): void;
		/** Attach a hook that is invoked before a vnode has rendered */
		render?(vnode: VNode): void;
		/** Attach a hook that is invoked after a vnode has rendered */
		diffed?(vnode: VNode): void;
		event?(e: Event): void;
	}

	const options: Options;

	//
	// Preact helpers
	// -----------------------------------
	function createRef<T = any>(): RefObject<T>;
	function toChildArray(children: ComponentChildren): Array<VNode | null>;

	//
	// Context
	// -----------------------------------
	interface PreactConsumer<T> extends FunctionalComponent<{
		children: (value: T) => ComponentChildren
	}> {}

	interface PreactProvider<T> extends FunctionalComponent<{
		value: T,
		children: ComponentChildren
	}> {}

	interface PreactContext<T> {
		Consumer: PreactConsumer<T>;
		Provider: PreactProvider<T>;
	}

	function createContext<T>(defaultValue: T): PreactContext<T>;
}
