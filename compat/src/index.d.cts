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

	// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
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
	export import Key = preact1.Key;

	// Suspense
	export import Suspense = _Suspense.Suspense;
	export import lazy = _Suspense.lazy;

	// Compat
	export import StrictMode = preact1.Fragment;
	export const version: string;
	export function startTransition(cb: () => void): void;

	// HTML
	export interface HTMLAttributes<T extends EventTarget>
		extends preact1.HTMLAttributes<T> {}
	export interface HTMLProps<T extends EventTarget>
		extends preact1.AllHTMLAttributes<T>,
			preact1.ClassAttributes<T> {}
	export interface AllHTMLAttributes<T extends EventTarget>
		extends preact1.AllHTMLAttributes<T> {}
	export import DetailedHTMLProps = preact1.DetailedHTMLProps;
	export import CSSProperties = preact1.CSSProperties;

	export interface SVGProps<T extends EventTarget>
		extends preact1.SVGAttributes<T>,
			preact1.ClassAttributes<T> {}

	interface SVGAttributes<T extends EventTarget = SVGElement>
		extends preact1.SVGAttributes<T> {}

	interface ReactSVG extends JSXInternal.IntrinsicSVGElements {}

	export import AriaAttributes = preact1.AriaAttributes;

	export import HTMLAttributeReferrerPolicy = preact1.HTMLAttributeReferrerPolicy;
	export import HTMLAttributeAnchorTarget = preact1.HTMLAttributeAnchorTarget;
	export import HTMLInputTypeAttribute = preact1.HTMLInputTypeAttribute;
	export import HTMLAttributeCrossOrigin = preact1.HTMLAttributeCrossOrigin;

	export import AnchorHTMLAttributes = preact1.AnchorHTMLAttributes;
	export import AudioHTMLAttributes = preact1.AudioHTMLAttributes;
	export import AreaHTMLAttributes = preact1.AreaHTMLAttributes;
	export import BaseHTMLAttributes = preact1.BaseHTMLAttributes;
	export import BlockquoteHTMLAttributes = preact1.BlockquoteHTMLAttributes;
	export import ButtonHTMLAttributes = preact1.ButtonHTMLAttributes;
	export import CanvasHTMLAttributes = preact1.CanvasHTMLAttributes;
	export import ColHTMLAttributes = preact1.ColHTMLAttributes;
	export import ColgroupHTMLAttributes = preact1.ColgroupHTMLAttributes;
	export import DataHTMLAttributes = preact1.DataHTMLAttributes;
	export import DetailsHTMLAttributes = preact1.DetailsHTMLAttributes;
	export import DelHTMLAttributes = preact1.DelHTMLAttributes;
	export import DialogHTMLAttributes = preact1.DialogHTMLAttributes;
	export import EmbedHTMLAttributes = preact1.EmbedHTMLAttributes;
	export import FieldsetHTMLAttributes = preact1.FieldsetHTMLAttributes;
	export import FormHTMLAttributes = preact1.FormHTMLAttributes;
	export import IframeHTMLAttributes = preact1.IframeHTMLAttributes;
	export import ImgHTMLAttributes = preact1.ImgHTMLAttributes;
	export import InsHTMLAttributes = preact1.InsHTMLAttributes;
	export import InputHTMLAttributes = preact1.InputHTMLAttributes;
	export import KeygenHTMLAttributes = preact1.KeygenHTMLAttributes;
	export import LabelHTMLAttributes = preact1.LabelHTMLAttributes;
	export import LiHTMLAttributes = preact1.LiHTMLAttributes;
	export import LinkHTMLAttributes = preact1.LinkHTMLAttributes;
	export import MapHTMLAttributes = preact1.MapHTMLAttributes;
	export import MenuHTMLAttributes = preact1.MenuHTMLAttributes;
	export import MediaHTMLAttributes = preact1.MediaHTMLAttributes;
	export import MetaHTMLAttributes = preact1.MetaHTMLAttributes;
	export import MeterHTMLAttributes = preact1.MeterHTMLAttributes;
	export import QuoteHTMLAttributes = preact1.QuoteHTMLAttributes;
	export import ObjectHTMLAttributes = preact1.ObjectHTMLAttributes;
	export import OlHTMLAttributes = preact1.OlHTMLAttributes;
	export import OptgroupHTMLAttributes = preact1.OptgroupHTMLAttributes;
	export import OptionHTMLAttributes = preact1.OptionHTMLAttributes;
	export import OutputHTMLAttributes = preact1.OutputHTMLAttributes;
	export import ParamHTMLAttributes = preact1.ParamHTMLAttributes;
	export import ProgressHTMLAttributes = preact1.ProgressHTMLAttributes;
	export import SlotHTMLAttributes = preact1.SlotHTMLAttributes;
	export import ScriptHTMLAttributes = preact1.ScriptHTMLAttributes;
	export import SelectHTMLAttributes = preact1.SelectHTMLAttributes;
	export import SourceHTMLAttributes = preact1.SourceHTMLAttributes;
	export import StyleHTMLAttributes = preact1.StyleHTMLAttributes;
	export import TableHTMLAttributes = preact1.TableHTMLAttributes;
	export import TextareaHTMLAttributes = preact1.TextareaHTMLAttributes;
	export import TdHTMLAttributes = preact1.TdHTMLAttributes;
	export import ThHTMLAttributes = preact1.ThHTMLAttributes;
	export import TimeHTMLAttributes = preact1.TimeHTMLAttributes;
	export import TrackHTMLAttributes = preact1.TrackHTMLAttributes;
	export import VideoHTMLAttributes = preact1.VideoHTMLAttributes;

	// Events
	export import TargetedEvent = preact1.TargetedEvent;
	export import ChangeEvent = preact1.TargetedEvent;
	export import ClipboardEvent = preact1.TargetedClipboardEvent;
	export import CompositionEvent = preact1.TargetedCompositionEvent;
	export import DragEvent = preact1.TargetedDragEvent;
	export import PointerEvent = preact1.TargetedPointerEvent;
	export import FocusEvent = preact1.TargetedFocusEvent;
	export import FormEvent = preact1.TargetedEvent;
	export import InvalidEvent = preact1.TargetedEvent;
	export import KeyboardEvent = preact1.TargetedKeyboardEvent;
	export import MouseEvent = preact1.TargetedMouseEvent;
	export import TouchEvent = preact1.TargetedTouchEvent;
	export import UIEvent = preact1.TargetedUIEvent;
	export import AnimationEvent = preact1.TargetedAnimationEvent;
	export import TransitionEvent = preact1.TargetedTransitionEvent;

	// Event Handler Types
	export import EventHandler = preact1.EventHandler;
	export import ChangeEventHandler = preact1.GenericEventHandler;
	export import ClipboardEventHandler = preact1.ClipboardEventHandler;
	export import CompositionEventHandler = preact1.CompositionEventHandler;
	export import DragEventHandler = preact1.DragEventHandler;
	export import PointerEventHandler = preact1.PointerEventHandler;
	export import FocusEventHandler = preact1.FocusEventHandler;
	export import FormEventHandler = preact1.GenericEventHandler;
	export import InvalidEventHandler = preact1.GenericEventHandler;
	export import KeyboardEventHandler = preact1.KeyboardEventHandler;
	export import MouseEventHandler = preact1.MouseEventHandler;
	export import TouchEventHandler = preact1.TouchEventHandler;
	export import UIEventHandler = preact1.UIEventHandler;
	export import AnimationEventHandler = preact1.AnimationEventHandler;
	export import TransitionEventHandler = preact1.TransitionEventHandler;

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

	export function unstable_batchedUpdates<A, R>(callback: (a: A) => R, a: A): R;
	export function unstable_batchedUpdates<R>(callback: () => R): R;

	export type PropsWithChildren<P = unknown> = P & {
		children?: preact1.ComponentChildren | undefined;
	};

	export const Children: {
		map<T extends preact1.ComponentChild, R>(
			children: T | T[],
			fn: (child: T, i: number) => R,
			context: any
		): R[];
		forEach<T extends preact1.ComponentChild>(
			children: T | T[],
			fn: (child: T, i: number) => void,
			context: any
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
