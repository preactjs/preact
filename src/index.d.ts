export = preact;
export as namespace preact;

import "./jsx";

declare namespace preact {
	//
	// Preact Virutal DOM
	// -----------------------------------

	interface VNode<P = {}> {
		tag: ComponentFactory<P> | string | null;
		props: P & { children: ComponentChildren };
		text?: string | number | null;
		key?: Key;
	}

	//
	// Preact Component interface
	// -----------------------------------

	type Key = string | number;
	type Ref<T> = (instance: T) => void;
	type ComponentChild = VNode<any> | string | number | null | undefined;
	type ComponentChildren = ComponentChild[] | object | VNode<any> | string | number | null | undefined;

	interface Attributes {
		key?: string | number | any;
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

	type ComponentFactory<P> = ComponentConstructor<P> | FunctionalComponent<P>;

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
	}

	// Type alias for a component considered generally, whether stateless or stateful.
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
		componentDidCatch(error: any): void;
	}

	abstract class Component<P, S> {
		constructor(props?: P, context?: any);

		static displayName?: string;
		static defaultProps?: any;
		static getDerivedStateFromProps?<P, S>(props: P, state: S): Partial<S>;

		state: Readonly<S>;
		props: RenderableProps<P>;
		context: any;
		base?: HTMLElement;

		setState<K extends keyof S>(state: Pick<S, K>, callback?: () => void): void;
		setState<K extends keyof S>(fn: (prevState: S, props: P) => Pick<S, K>, callback?: () => void): void;

		forceUpdate(callback?: () => void): void;

		abstract render(props?: RenderableProps<P>, state?: Readonly<S>, context?: any): ComponentChild;
	}

	//
	// Preact createElement
	// -----------------------------------

	function createElement<P>(
		tag: ComponentFactory<P>,
		props: Attributes & P | null,
		...children: ComponentChildren[]
	): VNode<any>;
	function createElement(
		tag: string,
		props: JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any> | null,
		...children: ComponentChildren[]
	): VNode<any>;

	//
	// Preact render
	// -----------------------------------

	function render(vnode: ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment): void
	function hydrate(vnode: ComponentChild, parent: Element | Document | ShadowRoot | DocumentFragment): void
	function cloneElement(vnode: JSX.Element, props: any, ...children: ComponentChildren[]): JSX.Element;

	//
	// Preact Built-in Components
	// -----------------------------------

	const Fragment: ComponentConstructor<{}, {}>;

	//
	// Preact options
	// -----------------------------------

	// var options: {
	// 	syncComponentUpdates?: boolean;
	// 	debounceRendering?: (render: () => void) => void;
	// 	vnode?: (vnode: VNode<any>) => void;
	// 	event?: (event: Event) => Event;
	// };
}
