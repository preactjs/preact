import { PreactContext, JSX, Component } from 'preact';

type FC<P> = (props: P) => JSX.Element;

type createComponentFN<P> = (c: Component<P>) => FC<P>;
/**
 * Wraps a FunctionalComponent to be handled with the composition api
 * @param fn
 */
export function createComponent<P>(fn: createComponentFN<P>): FC<P>;

export function memo<P = {}>(comparer?: (prev: P, next: P) => boolean): void;

export type ReactiveHolder<T extends {}> = T & {
	// get or set the immutable inner value of this reactive
	$value: T;
};
/**
 * Creates a Proxy around the `value` object that any time its change it will update the component
 * @param value
 */
export function reactive<T extends {}>(value: T): ReactiveHolder<T>;

export type ValueHolder<T> = { value: T };

/**
 * Returns a reference with a `value` property, that when it changes will update the component if not `staticRef`
 * @param v
 */
export function value<T>(v?: T): ValueHolder<T>;

export function unwrap<T>(
	refOrValue: ValueHolder<T> | ReactiveHolder<T> | T
): T;
export function isReactive(v: any): boolean;

/**
 * @param callback run on mount
 */
export function onMounted(callback: () => void): void;

/**
 * @param callback run on unmount
 */
export function onUnmounted(cb: () => void): void;

export type EffectCallback<T> = (
	args: T,
	oldArgs: T,
	onCleanup: Function
) => void;
export type PropGetter<P, T> = (props: P) => T;
export type WatchSrc<T, P> =
	| PropGetter<P, T>
	| ValueHolder<T>
	| ReactiveHolder<T>
	| PreactContext<T>;

type WatchCb<T extends Array<any>, R> = (...value: T) => R;

export type WatchResult<T> = { readonly value: T };

/**
 * `watch` function can operate in many ways.
 *
 * Before each render all `watch`'ers are run or updated with the new value
 * and if any args from src changed `callback` is called with the new args and the old args
 * ```js
 * watch(props => props.id) //returns `value` id props value (kinda irrelevant)
 * watch(props => props.a + props.b) //acts like a compute function and returns a `value` summing props a + b
 * watch(someValue, value => console.log('The value of someValue is: ', value))
 * ```
 * @param src
 * @param callback optional callback to call if the args returned from src changed
 * @returns `value` holding the result from the first `src` specified or the return of the `callback`
 */

/** watch values */
export function watch<P, T>(src: WatchSrc<T, P>): WatchResult<T>;
export function watch<P, T0, T1>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>]
): WatchResult<[T0, T1]>;
export function watch<P, T0, T1, T2>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>, WatchSrc<T2, P>]
): WatchResult<[T0, T1, T2]>;

/** watch values with a callback returning a promise and default value */
export function watch<P, T, R>(
	src: WatchSrc<T, P>,
	cb: (value: T) => PromiseLike<R>,
	def: R
): WatchResult<R>;
export function watch<P, T0, T1, R>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>],
	cb: WatchCb<[T0, T1], PromiseLike<R>>,
	def: R
): WatchResult<R>;
export function watch<P, T0, T1, T2, R>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>, WatchSrc<T2, P>],
	cb: WatchCb<[T0, T1, T2], PromiseLike<R>>,
	def: R
): WatchResult<R>;

/** watch values with a callback returning a promise */
export function watch<P, T, R>(
	src: WatchSrc<T, P>,
	cb: WatchCb<[T], PromiseLike<R>>
): WatchResult<R | undefined>;
export function watch<P, T0, T1, R>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>],
	cb: WatchCb<[T0, T1], PromiseLike<R>>
): WatchResult<R | undefined>;
export function watch<P, T0, T1, T2, R>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>, WatchSrc<T2, P>],
	cb: WatchCb<[T0, T1, T2], PromiseLike<R>>
): WatchResult<R | undefined>;

/** watch values with a callback returning a value */
export function watch<P, T, R>(
	src: WatchSrc<T, P>,
	cb: WatchCb<[T], R>
): WatchResult<R>;
export function watch<P, T0, T1, R>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>],
	cb: WatchCb<[T0, T1], R>
): WatchResult<R>;
export function watch<P, T0, T1, T2, R>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>, WatchSrc<T2, P>],
	cb: WatchCb<[T0, T1, T2], R>
): WatchResult<R>;

/**
 * `effect` its run after render it can also be used to callback when something changed
 * The callback will receive newArgs, oldArgs and onCleanup to assign a cleanup function
 * @param src
 * @param callback optional callback to call if the args returned from src changed
 * @returns nothing
 */
export function effect<P, T>(src: WatchSrc<T, P>, cb: EffectCallback<T>): void;
export function effect<P, T0, T1>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>],
	cb: EffectCallback<[T0, T1]>
): void;
export function effect<P, T0, T1, T2>(
	src: [WatchSrc<T0, P>, WatchSrc<T1, P>, WatchSrc<T2, P>],
	cb: EffectCallback<[T0, T1, T2]>
): void;
// todo more effect overloads to cover all cases

export interface InjectionKey<T> extends String {}

export function provide<T>(key: InjectionKey<T> | string, value: T): void;
export function inject<T>(key: InjectionKey<T> | string): T | undefined;
export function inject<T>(key: InjectionKey<T> | string, defaultValue: T): T;
