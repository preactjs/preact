import * as _hooks from '../../hooks';
// Intentionally not using a relative path to take advantage of
// the TS version resolution mechanism
import * as preact1 from 'preact';
import { JSXInternal } from '../../src/jsx';
import * as _Suspense from './suspense';

declare namespace preact {
	export interface FunctionComponent<P = {}> {
		(
			props: preact1.RenderableProps<P>,
			context?: any
		): preact1.ComponentChildren;
		displayName?: string;
		defaultProps?: Partial<P> | undefined;
	}

	export interface ComponentClass<P = {}, S = {}> {
		new (props: P, context?: any): preact1.Component<P, S>;
		displayName?: string;
		defaultProps?: Partial<P>;
		contextType?: preact1.Context<any>;
		getDerivedStateFromProps?(
			props: Readonly<P>,
			state: Readonly<S>
		): Partial<S> | null;
		getDerivedStateFromError?(error: any): Partial<S> | null;
	}

	export interface Component<P = {}, S = {}> {
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
		componentDidCatch?(error: any, errorInfo: preact1.ErrorInfo): void;
	}

	export abstract class Component<P, S> {
		constructor(props?: P, context?: any);

		static displayName?: string;
		static defaultProps?: any;
		static contextType?: preact1.Context<any>;

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
		props: preact1.RenderableProps<P>;
		context: any;

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
			props?: preact1.RenderableProps<P>,
			state?: Readonly<S>,
			context?: any
		): preact1.ComponentChildren;
	}
}

// export default React;
export = React;
export as namespace React;
declare namespace React {
	// Export JSX
	export import JSX = JSXInternal;

	// Hooks
	export import CreateHandle = _hooks.CreateHandle;
	export import EffectCallback = _hooks.EffectCallback;
	export import Inputs = _hooks.Inputs;
	export import Reducer = _hooks.Reducer;
	export import Dispatch = _hooks.Dispatch;
	export import SetStateAction = _hooks.StateUpdater;
	export import useCallback = _hooks.useCallback;
	export import useContext = _hooks.useContext;
	export import useDebugValue = _hooks.useDebugValue;
	export import useEffect = _hooks.useEffect;
	export import useImperativeHandle = _hooks.useImperativeHandle;
	export import useId = _hooks.useId;
	export import useLayoutEffect = _hooks.useLayoutEffect;
	export import useMemo = _hooks.useMemo;
	export import useReducer = _hooks.useReducer;
	export import useRef = _hooks.useRef;
	export import useState = _hooks.useState;
	// React 18 hooks
	export import useInsertionEffect = _hooks.useLayoutEffect;
	export function useTransition(): [false, typeof startTransition];
	export function useDeferredValue<T = any>(val: T): T;
	export function useSyncExternalStore<T>(
		subscribe: (flush: () => void) => () => void,
		getSnapshot: () => T
	): T;

	// Preact Defaults
	export import Context = preact1.Context;
	export import ContextType = preact1.ContextType;
	export import RefObject = preact1.RefObject;
	export import Component = preact.Component;
	export import FunctionComponent = preact.FunctionComponent;
	export import ComponentType = preact1.ComponentType;
	export import ComponentClass = preact.ComponentClass;
	export import FC = preact1.FunctionComponent;
	export import createContext = preact1.createContext;
	export import Ref = preact1.Ref;
	export import createRef = preact1.createRef;
	export import Fragment = preact1.Fragment;
	export import createElement = preact1.createElement;
	export import cloneElement = preact1.cloneElement;
	export import ComponentProps = preact1.ComponentProps;
	export import ReactNode = preact1.ComponentChild;
	export import ReactElement = preact1.VNode;
	export import Consumer = preact1.Consumer;
	export import ErrorInfo = preact1.ErrorInfo;

	// Suspense
	export import Suspense = _Suspense.Suspense;
	export import lazy = _Suspense.lazy;

	// Compat
	export import StrictMode = preact1.Fragment;
	export const version: string;
	export function startTransition(cb: () => void): void;

	// HTML
	export interface HTMLAttributes<T extends EventTarget>
		extends JSXInternal.HTMLAttributes<T> {}
	export interface HTMLProps<T extends EventTarget>
		extends JSXInternal.AllHTMLAttributes<T>,
			preact1.ClassAttributes<T> {}
	export interface AllHTMLAttributes<T extends EventTarget>
		extends JSXInternal.AllHTMLAttributes<T> {}
	export import DetailedHTMLProps = JSXInternal.DetailedHTMLProps;
	export import CSSProperties = JSXInternal.CSSProperties;

	export interface SVGProps<T extends EventTarget>
		extends JSXInternal.SVGAttributes<T>,
			preact1.ClassAttributes<T> {}

	interface SVGAttributes extends JSXInternal.SVGAttributes {}

	interface ReactSVG extends JSXInternal.IntrinsicSVGElements {}

	export import AriaAttributes = JSXInternal.AriaAttributes;

	export import HTMLAttributeReferrerPolicy = JSXInternal.HTMLAttributeReferrerPolicy;
	export import HTMLAttributeAnchorTarget = JSXInternal.HTMLAttributeAnchorTarget;
	export import HTMLInputTypeAttribute = JSXInternal.HTMLInputTypeAttribute;
	export import HTMLAttributeCrossOrigin = JSXInternal.HTMLAttributeCrossOrigin;

	export import AnchorHTMLAttributes = JSXInternal.AnchorHTMLAttributes;
	export import AudioHTMLAttributes = JSXInternal.AudioHTMLAttributes;
	export import AreaHTMLAttributes = JSXInternal.AreaHTMLAttributes;
	export import BaseHTMLAttributes = JSXInternal.BaseHTMLAttributes;
	export import BlockquoteHTMLAttributes = JSXInternal.BlockquoteHTMLAttributes;
	export import ButtonHTMLAttributes = JSXInternal.ButtonHTMLAttributes;
	export import CanvasHTMLAttributes = JSXInternal.CanvasHTMLAttributes;
	export import ColHTMLAttributes = JSXInternal.ColHTMLAttributes;
	export import ColgroupHTMLAttributes = JSXInternal.ColgroupHTMLAttributes;
	export import DataHTMLAttributes = JSXInternal.DataHTMLAttributes;
	export import DetailsHTMLAttributes = JSXInternal.DetailsHTMLAttributes;
	export import DelHTMLAttributes = JSXInternal.DelHTMLAttributes;
	export import DialogHTMLAttributes = JSXInternal.DialogHTMLAttributes;
	export import EmbedHTMLAttributes = JSXInternal.EmbedHTMLAttributes;
	export import FieldsetHTMLAttributes = JSXInternal.FieldsetHTMLAttributes;
	export import FormHTMLAttributes = JSXInternal.FormHTMLAttributes;
	export import IframeHTMLAttributes = JSXInternal.IframeHTMLAttributes;
	export import ImgHTMLAttributes = JSXInternal.ImgHTMLAttributes;
	export import InsHTMLAttributes = JSXInternal.InsHTMLAttributes;
	export import InputHTMLAttributes = JSXInternal.InputHTMLAttributes;
	export import KeygenHTMLAttributes = JSXInternal.KeygenHTMLAttributes;
	export import LabelHTMLAttributes = JSXInternal.LabelHTMLAttributes;
	export import LiHTMLAttributes = JSXInternal.LiHTMLAttributes;
	export import LinkHTMLAttributes = JSXInternal.LinkHTMLAttributes;
	export import MapHTMLAttributes = JSXInternal.MapHTMLAttributes;
	export import MenuHTMLAttributes = JSXInternal.MenuHTMLAttributes;
	export import MediaHTMLAttributes = JSXInternal.MediaHTMLAttributes;
	export import MetaHTMLAttributes = JSXInternal.MetaHTMLAttributes;
	export import MeterHTMLAttributes = JSXInternal.MeterHTMLAttributes;
	export import QuoteHTMLAttributes = JSXInternal.QuoteHTMLAttributes;
	export import ObjectHTMLAttributes = JSXInternal.ObjectHTMLAttributes;
	export import OlHTMLAttributes = JSXInternal.OlHTMLAttributes;
	export import OptgroupHTMLAttributes = JSXInternal.OptgroupHTMLAttributes;
	export import OptionHTMLAttributes = JSXInternal.OptionHTMLAttributes;
	export import OutputHTMLAttributes = JSXInternal.OutputHTMLAttributes;
	export import ParamHTMLAttributes = JSXInternal.ParamHTMLAttributes;
	export import ProgressHTMLAttributes = JSXInternal.ProgressHTMLAttributes;
	export import SlotHTMLAttributes = JSXInternal.SlotHTMLAttributes;
	export import ScriptHTMLAttributes = JSXInternal.ScriptHTMLAttributes;
	export import SelectHTMLAttributes = JSXInternal.SelectHTMLAttributes;
	export import SourceHTMLAttributes = JSXInternal.SourceHTMLAttributes;
	export import StyleHTMLAttributes = JSXInternal.StyleHTMLAttributes;
	export import TableHTMLAttributes = JSXInternal.TableHTMLAttributes;
	export import TextareaHTMLAttributes = JSXInternal.TextareaHTMLAttributes;
	export import TdHTMLAttributes = JSXInternal.TdHTMLAttributes;
	export import ThHTMLAttributes = JSXInternal.ThHTMLAttributes;
	export import TimeHTMLAttributes = JSXInternal.TimeHTMLAttributes;
	export import TrackHTMLAttributes = JSXInternal.TrackHTMLAttributes;
	export import VideoHTMLAttributes = JSXInternal.VideoHTMLAttributes;

	// Events
	export import TargetedEvent = JSXInternal.TargetedEvent;
	export import ChangeEvent = JSXInternal.TargetedEvent;
	export import ClipboardEvent = JSXInternal.TargetedClipboardEvent;
	export import CompositionEvent = JSXInternal.TargetedCompositionEvent;
	export import DragEvent = JSXInternal.TargetedDragEvent;
	export import PointerEvent = JSXInternal.TargetedPointerEvent;
	export import FocusEvent = JSXInternal.TargetedFocusEvent;
	export import FormEvent = JSXInternal.TargetedEvent;
	export import InvalidEvent = JSXInternal.TargetedEvent;
	export import KeyboardEvent = JSXInternal.TargetedKeyboardEvent;
	export import MouseEvent = JSXInternal.TargetedMouseEvent;
	export import TouchEvent = JSXInternal.TargetedTouchEvent;
	export import UIEvent = JSXInternal.TargetedUIEvent;
	export import AnimationEvent = JSXInternal.TargetedAnimationEvent;
	export import TransitionEvent = JSXInternal.TargetedTransitionEvent;

	// Event Handler Types
	export import EventHandler = JSXInternal.EventHandler;
	export import ChangeEventHandler = JSXInternal.GenericEventHandler;
	export import ClipboardEventHandler = JSXInternal.ClipboardEventHandler;
	export import CompositionEventHandler = JSXInternal.CompositionEventHandler;
	export import DragEventHandler = JSXInternal.DragEventHandler;
	export import PointerEventHandler = JSXInternal.PointerEventHandler;
	export import FocusEventHandler = JSXInternal.FocusEventHandler;
	export import FormEventHandler = JSXInternal.GenericEventHandler;
	export import InvalidEventHandler = JSXInternal.GenericEventHandler;
	export import KeyboardEventHandler = JSXInternal.KeyboardEventHandler;
	export import MouseEventHandler = JSXInternal.MouseEventHandler;
	export import TouchEventHandler = JSXInternal.TouchEventHandler;
	export import UIEventHandler = JSXInternal.UIEventHandler;
	export import AnimationEventHandler = JSXInternal.AnimationEventHandler;
	export import TransitionEventHandler = JSXInternal.TransitionEventHandler;

	export function createPortal(
		vnode: preact1.ComponentChildren,
		container: preact1.ContainerNode
	): preact1.VNode<any>;

	export function render(
		vnode: preact1.ComponentChild,
		parent: preact1.ContainerNode,
		callback?: () => void
	): Component | null;

	export function hydrate(
		vnode: preact1.ComponentChild,
		parent: preact1.ContainerNode,
		callback?: () => void
	): Component | null;

	export function unmountComponentAtNode(
		container: preact1.ContainerNode
	): boolean;

	export function createFactory(
		type: preact1.VNode<any>['type']
	): (
		props?: any,
		...children: preact1.ComponentChildren[]
	) => preact1.VNode<any>;
	export function isValidElement(element: any): boolean;
	export function isFragment(element: any): boolean;
	export function isMemo(element: any): boolean;
	export function findDOMNode(
		component: preact1.Component | Element
	): Element | null;

	export abstract class PureComponent<
		P = {},
		S = {},
		SS = any
	> extends preact1.Component<P, S> {
		isPureReactComponent: boolean;
	}

	export type MemoExoticComponent<C extends preact1.FunctionalComponent<any>> =
		preact1.FunctionComponent<ComponentProps<C>> & {
			readonly type: C;
		};

	export function memo<P = {}>(
		component: preact1.FunctionalComponent<P>,
		comparer?: (prev: P, next: P) => boolean
	): preact1.FunctionComponent<P>;
	export function memo<C extends preact1.FunctionalComponent<any>>(
		component: C,
		comparer?: (
			prev: preact1.ComponentProps<C>,
			next: preact1.ComponentProps<C>
		) => boolean
	): C;

	export interface RefAttributes<R> extends preact1.Attributes {
		ref?: preact1.Ref<R> | undefined;
	}

	/**
	 * @deprecated Please use `ForwardRefRenderFunction` instead.
	 */
	export interface ForwardFn<P = {}, T = any> {
		(props: P, ref: ForwardedRef<T>): preact1.ComponentChild;
		displayName?: string;
	}

	export interface ForwardRefRenderFunction<T = any, P = {}> {
		(props: P, ref: ForwardedRef<T>): preact1.ComponentChild;
		displayName?: string;
	}

	export interface ForwardRefExoticComponent<P>
		extends preact1.FunctionComponent<P> {
		defaultProps?: Partial<P> | undefined;
	}

	export function forwardRef<R, P = {}>(
		fn: ForwardRefRenderFunction<R, P>
	): preact1.FunctionalComponent<PropsWithoutRef<P> & { ref?: preact1.Ref<R> }>;

	export type PropsWithoutRef<P> = Omit<P, 'ref'>;

	interface MutableRefObject<T> {
		current: T;
	}

	export type ForwardedRef<T> =
		| ((instance: T | null) => void)
		| MutableRefObject<T | null>
		| null;

	export type ElementType<
		P = any,
		Tag extends keyof JSX.IntrinsicElements = keyof JSX.IntrinsicElements
	> =
		| { [K in Tag]: P extends JSX.IntrinsicElements[K] ? K : never }[Tag]
		| ComponentType<P>;

	export type ComponentPropsWithoutRef<T extends ElementType> = PropsWithoutRef<
		ComponentProps<T>
	>;

	export type ComponentPropsWithRef<C extends ElementType> = C extends new (
		props: infer P
	) => Component<any, any>
		? PropsWithoutRef<P> & RefAttributes<InstanceType<C>>
		: ComponentProps<C>;

	export type ElementRef<
		C extends
			| ForwardRefExoticComponent<any>
			| { new (props: any): Component<any, any> }
			| ((props: any) => ReactNode)
			| keyof JSXInternal.IntrinsicElements
	> = 'ref' extends keyof ComponentPropsWithRef<C>
		? NonNullable<ComponentPropsWithRef<C>['ref']> extends RefAttributes<
				infer Instance
			>['ref']
			? Instance
			: never
		: never;

	export function flushSync<R>(fn: () => R): R;
	export function flushSync<A, R>(fn: (a: A) => R, a: A): R;

	export type PropsWithChildren<P = unknown> = P & {
		children?: preact1.ComponentChildren | undefined;
	};

	export const Children: {
		map<T extends preact1.ComponentChild, R>(
			children: T | T[],
			fn: (child: T, i: number) => R
		): R[];
		forEach<T extends preact1.ComponentChild>(
			children: T | T[],
			fn: (child: T, i: number) => void
		): void;
		count: (children: preact1.ComponentChildren) => number;
		only: (children: preact1.ComponentChildren) => preact1.ComponentChild;
		toArray: (children: preact1.ComponentChildren) => preact1.VNode<{}>[];
	};

	// scheduler
	export const unstable_ImmediatePriority: number;
	export const unstable_UserBlockingPriority: number;
	export const unstable_NormalPriority: number;
	export const unstable_LowPriority: number;
	export const unstable_IdlePriority: number;
	export function unstable_runWithPriority(
		priority: number,
		callback: () => void
	): void;
	export const unstable_now: () => number;
}
