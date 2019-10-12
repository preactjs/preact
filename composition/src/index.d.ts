import { PreactContext, JSX } from 'preact';

type FC<P> = (props: P) => JSX.Element;

type createComponentFN<P> = (getProps: () => P) => FC<P>;
/**
 * Wraps a FunctionalComponent to be handled with the composition api
 * @param fn
 */
export function createComponent<P>(fn: createComponentFN<P>): FC<P>;

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

export type WatchCallback<T, R> = (
  args: T,
  oldArgs: T,
  onCleanup: Function
) => R;
export type PropGetter<P, T> = (props: P) => T;
export type WatchSrc<T, P> =
  | PropGetter<P, T>
  | ValueHolder<T>
  | ReactiveHolder<T>
  | PreactContext<T>;

export type WatchResult<T> = { readonly value: T };

/**
 * `watch` function can operate in many ways.
 *
 * Before each render all `watch`'ers are run or updated with the new value
 * and if any args from src changed `callback` is called with the new args and the old args
 * ```js
 * watch(props => props.id) //returns `value` id props value (kinda irrelevant)
 * watch(props => props.a + props.b) //acts like a compute function and returns a `value` summing props a + b
 * watch(someRef, refValue => console.log('The value of someRef is: ', refValue))
 * ```
 * @param src
 * @param callback optional callback to call if the args returned from src changed
 * @returns `value` holding the result from the first `src` specified or the return of the `callback`
 */

export type Unpack<P, T extends (WatchSrc<any, P>)[]> = {
  [I in keyof T]: T[I] extends WatchSrc<infer U, P> ? U : never;
};

export function watch<P, T extends (WatchSrc<any, P>)[]>(src: T): Unpack<P, T>;
export function watch<P, T extends (WatchSrc<any, P>)[], R>(
  src: T,
  cb: WatchCallback<Unpack<P, T>, PromiseLike<R>>,
  def: R
): WatchResult<R>;
export function watch<P, T extends (WatchSrc<any, P>)[], R>(
  src: T,
  cb: WatchCallback<Unpack<P, T>, R>
): WatchResult<R>;

export function watch<P, T>(src: WatchSrc<T, P>): WatchResult<T>;
export function watch<P, T, R>(
  src: WatchSrc<T, P>,
  cb: WatchCallback<T, PromiseLike<R>>,
  def: R
): WatchResult<R>;
export function watch<P, T, R>(
  src: WatchSrc<T, P>,
  cb: WatchCallback<T, PromiseLike<R>>
): { readonly value: R | undefined };
export function watch<P, T, R>(
  src: WatchSrc<T, P>,
  cb: WatchCallback<T, R>
): WatchResult<R>;

/**
 * `effect` acts like `watch` and it supports the same parameters buts its run after render
 *  And it does not return a `value`
 * @param src
 * @param callback optional callback to call if the args returned from src changed
 * @returns nothing
 */
export function effect<P, T>(
  src: WatchSrc<T, P>,
  cb: WatchCallback<T, void>
): void;
export function effect<P, T extends (WatchSrc<any, P>)[]>(
  src: T,
  cb: WatchCallback<Unpack<P, T>, void>
): void;

interface InjectionKey<T> extends String {}

export function provide<T>(key: InjectionKey<T> | string, value: T): void;
export function inject<T>(key: InjectionKey<T> | string): T | undefined;
export function inject<T>(key: InjectionKey<T> | string, defaultValue: T): T;
