import * as _preact from '../../src/index.js';
import { JSXInternal } from '../../src/jsx.js';
import * as _hooks from '../../hooks/src/index.js';
import * as _Suspense from './suspense.js';

declare namespace preact {
	export interface FunctionComponent<P = {}> {
		(
			props: _preact.RenderableProps<P>,
			context?: any
		): _preact.ComponentChildren;
		displayName?: string;
		defaultProps?: Partial<P> | undefined;
	}

	export interface ComponentClass<P = {}, S = {}> {
		new (props: P, context?: any): _preact.Component<P, S>;
		displayName?: string;
		defaultProps?: Partial<P>;
		contextType?: _preact.Context<any>;
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
		componentDidCatch?(error: any, errorInfo: _preact.ErrorInfo): void;
	}

	export abstract class Component<P, S> {
		constructor(props?: P, context?: any);

		static displayName?: string;
		static defaultProps?: any;
		static contextType?: _preact.Context<any>;

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
		props: _preact.RenderableProps<P>;
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
			props?: _preact.RenderableProps<P>,
			state?: Readonly<S>,
			context?: any
		): _preact.ComponentChildren;
	}
}

// export default React;
export default React;
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
	export import Context = _preact.Context;
	export import ContextType = _preact.ContextType;
	export import RefObject = _preact.RefObject;
	export import Component = preact.Component;
	export import FunctionComponent = preact.FunctionComponent;
	export import ComponentType = _preact.ComponentType;
	export import ComponentClass = preact.ComponentClass;
	export import FC = _preact.FunctionComponent;
	export import createContext = _preact.createContext;
	export import Ref = _preact.Ref;
	export import createRef = _preact.createRef;
	export import Fragment = _preact.Fragment;
	export import createElement = _preact.createElement;
	export import cloneElement = _preact.cloneElement;
	export import ComponentProps = _preact.ComponentProps;
	export import ReactNode = _preact.ComponentChild;
	export import ReactElement = _preact.VNode;
	export import Consumer = _preact.Consumer;
	export import ErrorInfo = _preact.ErrorInfo;
	export import Key = _preact.Key;

	// Suspense
	export import Suspense = _Suspense.Suspense;
	export import lazy = _Suspense.lazy;

	// Compat
	export import StrictMode = _preact.Fragment;
	export const version: string;
	export function startTransition(cb: () => void): void;

	// HTML
	export interface HTMLAttributes<T extends EventTarget>
		extends _preact.HTMLAttributes<T> {}
	export interface HTMLProps<T extends EventTarget>
		extends _preact.AllHTMLAttributes<T>,
			_preact.ClassAttributes<T> {}
	export interface AllHTMLAttributes<T extends EventTarget>
		extends _preact.AllHTMLAttributes<T> {}
	export import DetailedHTMLProps = _preact.DetailedHTMLProps;
	export import CSSProperties = _preact.CSSProperties;

	export interface SVGProps<T extends EventTarget>
		extends _preact.SVGAttributes<T>,
			_preact.ClassAttributes<T> {}

	interface SVGAttributes<T extends EventTarget = SVGElement>
		extends _preact.SVGAttributes<T> {}

	interface ReactSVG extends JSXInternal.IntrinsicSVGElements {}

	export import AriaAttributes = _preact.AriaAttributes;

	export import HTMLAttributeReferrerPolicy = _preact.HTMLAttributeReferrerPolicy;
	export import HTMLAttributeAnchorTarget = _preact.HTMLAttributeAnchorTarget;
	export import HTMLInputTypeAttribute = _preact.HTMLInputTypeAttribute;
	export import HTMLAttributeCrossOrigin = _preact.HTMLAttributeCrossOrigin;

	export import AnchorHTMLAttributes = _preact.AnchorHTMLAttributes;
	export import AudioHTMLAttributes = _preact.AudioHTMLAttributes;
	export import AreaHTMLAttributes = _preact.AreaHTMLAttributes;
	export import BaseHTMLAttributes = _preact.BaseHTMLAttributes;
	export import BlockquoteHTMLAttributes = _preact.BlockquoteHTMLAttributes;
	export import ButtonHTMLAttributes = _preact.ButtonHTMLAttributes;
	export import CanvasHTMLAttributes = _preact.CanvasHTMLAttributes;
	export import ColHTMLAttributes = _preact.ColHTMLAttributes;
	export import ColgroupHTMLAttributes = _preact.ColgroupHTMLAttributes;
	export import DataHTMLAttributes = _preact.DataHTMLAttributes;
	export import DetailsHTMLAttributes = _preact.DetailsHTMLAttributes;
	export import DelHTMLAttributes = _preact.DelHTMLAttributes;
	export import DialogHTMLAttributes = _preact.DialogHTMLAttributes;
	export import EmbedHTMLAttributes = _preact.EmbedHTMLAttributes;
	export import FieldsetHTMLAttributes = _preact.FieldsetHTMLAttributes;
	export import FormHTMLAttributes = _preact.FormHTMLAttributes;
	export import IframeHTMLAttributes = _preact.IframeHTMLAttributes;
	export import ImgHTMLAttributes = _preact.ImgHTMLAttributes;
	export import InsHTMLAttributes = _preact.InsHTMLAttributes;
	export import InputHTMLAttributes = _preact.InputHTMLAttributes;
	export import KeygenHTMLAttributes = _preact.KeygenHTMLAttributes;
	export import LabelHTMLAttributes = _preact.LabelHTMLAttributes;
	export import LiHTMLAttributes = _preact.LiHTMLAttributes;
	export import LinkHTMLAttributes = _preact.LinkHTMLAttributes;
	export import MapHTMLAttributes = _preact.MapHTMLAttributes;
	export import MenuHTMLAttributes = _preact.MenuHTMLAttributes;
	export import MediaHTMLAttributes = _preact.MediaHTMLAttributes;
	export import MetaHTMLAttributes = _preact.MetaHTMLAttributes;
	export import MeterHTMLAttributes = _preact.MeterHTMLAttributes;
	export import QuoteHTMLAttributes = _preact.QuoteHTMLAttributes;
	export import ObjectHTMLAttributes = _preact.ObjectHTMLAttributes;
	export import OlHTMLAttributes = _preact.OlHTMLAttributes;
	export import OptgroupHTMLAttributes = _preact.OptgroupHTMLAttributes;
	export import OptionHTMLAttributes = _preact.OptionHTMLAttributes;
	export import OutputHTMLAttributes = _preact.OutputHTMLAttributes;
	export import ParamHTMLAttributes = _preact.ParamHTMLAttributes;
	export import ProgressHTMLAttributes = _preact.ProgressHTMLAttributes;
	export import SlotHTMLAttributes = _preact.SlotHTMLAttributes;
	export import ScriptHTMLAttributes = _preact.ScriptHTMLAttributes;
	export import SelectHTMLAttributes = _preact.SelectHTMLAttributes;
	export import SourceHTMLAttributes = _preact.SourceHTMLAttributes;
	export import StyleHTMLAttributes = _preact.StyleHTMLAttributes;
	export import TableHTMLAttributes = _preact.TableHTMLAttributes;
	export import TextareaHTMLAttributes = _preact.TextareaHTMLAttributes;
	export import TdHTMLAttributes = _preact.TdHTMLAttributes;
	export import ThHTMLAttributes = _preact.ThHTMLAttributes;
	export import TimeHTMLAttributes = _preact.TimeHTMLAttributes;
	export import TrackHTMLAttributes = _preact.TrackHTMLAttributes;
	export import VideoHTMLAttributes = _preact.VideoHTMLAttributes;

	// Events
	export import TargetedEvent = _preact.TargetedEvent;
	export import ChangeEvent = _preact.TargetedEvent;
	export import ClipboardEvent = _preact.TargetedClipboardEvent;
	export import CompositionEvent = _preact.TargetedCompositionEvent;
	export import DragEvent = _preact.TargetedDragEvent;
	export import PointerEvent = _preact.TargetedPointerEvent;
	export import FocusEvent = _preact.TargetedFocusEvent;
	export import FormEvent = _preact.TargetedEvent;
	export import InvalidEvent = _preact.TargetedEvent;
	export import KeyboardEvent = _preact.TargetedKeyboardEvent;
	export import MouseEvent = _preact.TargetedMouseEvent;
	export import TouchEvent = _preact.TargetedTouchEvent;
	export import UIEvent = _preact.TargetedUIEvent;
	export import AnimationEvent = _preact.TargetedAnimationEvent;
	export import TransitionEvent = _preact.TargetedTransitionEvent;

	// Event Handler Types
	export import EventHandler = _preact.EventHandler;
	export import ChangeEventHandler = _preact.GenericEventHandler;
	export import ClipboardEventHandler = _preact.ClipboardEventHandler;
	export import CompositionEventHandler = _preact.CompositionEventHandler;
	export import DragEventHandler = _preact.DragEventHandler;
	export import PointerEventHandler = _preact.PointerEventHandler;
	export import FocusEventHandler = _preact.FocusEventHandler;
	export import FormEventHandler = _preact.GenericEventHandler;
	export import InvalidEventHandler = _preact.GenericEventHandler;
	export import KeyboardEventHandler = _preact.KeyboardEventHandler;
	export import MouseEventHandler = _preact.MouseEventHandler;
	export import TouchEventHandler = _preact.TouchEventHandler;
	export import UIEventHandler = _preact.UIEventHandler;
	export import AnimationEventHandler = _preact.AnimationEventHandler;
	export import TransitionEventHandler = _preact.TransitionEventHandler;

	export function createPortal(
		vnode: _preact.ComponentChildren,
		container: _preact.ContainerNode
	): _preact.VNode<any>;

	export function render(
		vnode: _preact.ComponentChild,
		parent: _preact.ContainerNode,
		callback?: () => void
	): Component | null;

	export function hydrate(
		vnode: _preact.ComponentChild,
		parent: _preact.ContainerNode,
		callback?: () => void
	): Component | null;

	export function unmountComponentAtNode(
		container: _preact.ContainerNode
	): boolean;

	export function createFactory(
		type: _preact.VNode<any>['type']
	): (
		props?: any,
		...children: _preact.ComponentChildren[]
	) => _preact.VNode<any>;
	export function isValidElement(element: any): boolean;
	export function isFragment(element: any): boolean;
	export function isMemo(element: any): boolean;
	export function findDOMNode(
		component: _preact.Component | Element
	): Element | null;

	export abstract class PureComponent<
		P = {},
		S = {},
		SS = any
	> extends _preact.Component<P, S> {
		isPureReactComponent: boolean;
	}

	export type MemoExoticComponent<C extends _preact.FunctionalComponent<any>> =
		_preact.FunctionComponent<ComponentProps<C>> & {
			readonly type: C;
		};

	export function memo<P = {}>(
		component: _preact.FunctionalComponent<P>,
		comparer?: (prev: P, next: P) => boolean
	): _preact.FunctionComponent<P>;
	export function memo<C extends _preact.FunctionalComponent<any>>(
		component: C,
		comparer?: (
			prev: _preact.ComponentProps<C>,
			next: _preact.ComponentProps<C>
		) => boolean
	): C;

	export interface RefAttributes<R> extends _preact.Attributes {
		ref?: _preact.Ref<R> | undefined;
	}

	export interface ForwardRefRenderFunction<T = any, P = {}> {
		(props: P, ref: ForwardedRef<T>): _preact.ComponentChild;
		displayName?: string;
	}

	export interface ForwardRefExoticComponent<P>
		extends _preact.FunctionComponent<P> {
		defaultProps?: Partial<P> | undefined;
	}

	export function forwardRef<R, P = {}>(
		fn: ForwardRefRenderFunction<R, P>
	): _preact.FunctionalComponent<PropsWithoutRef<P> & { ref?: _preact.Ref<R> }>;

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
		children?: _preact.ComponentChildren | undefined;
	};

	export const Children: {
		map<T extends _preact.ComponentChild, R>(
			children: T | T[],
			fn: (child: T, i: number) => R,
			context: any
		): R[];
		forEach<T extends _preact.ComponentChild>(
			children: T | T[],
			fn: (child: T, i: number) => void,
			context: any
		): void;
		count: (children: _preact.ComponentChildren) => number;
		only: (children: _preact.ComponentChildren) => _preact.ComponentChild;
		toArray: (children: _preact.ComponentChildren) => _preact.VNode<{}>[];
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
