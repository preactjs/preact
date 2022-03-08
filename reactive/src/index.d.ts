export interface Reactive<T> {
	value: T;
}

export type StateUpdater<S> = (value: S | ((prevState: S) => S)) => void;

/**
 * Returns a signal that holds the value and can be subscribed to in order to
 * react to changes.
 * @param initialValue The initial value
 * @param displayName Optional: Label for signal to use for debugging
 */
export function signal<T>(
	initialValue: T,
	displayName?: string
): [Reactive<T>, StateUpdater<T>];

/**
 * Create a derived signal from other signals. It tracks every signal that is
 * read and updates automatically when they change.
 * @param fn Function that tracks signal reads
 * @param displayName Optional: Label for signal to use for debugging
 */
export function computed<T>(fn: () => T, displayName?: string): Reactive<T>;

/**
 * Turn the passed `value` into a signal. Whenever a new value is passed to
 * `readonly` the signal is updated. This can be used to subscribe to `props`.
 * @param value
 * @param displayName Optional: Label for signal to use for debugging
 */
export function readonly<T>(value: T, displayName?: string): Atom<T>;

/**
 * Accepts a function that contains imperative, possibly effectful code.
 * The effects run after browser paint, without blocking it.
 *
 * @param fn Imperative function that can return a cleanup function
 * @param displayName Optional: Label for signal to use for debugging
 */
export function effect(fn: () => T, displayName?: string): void;

/**
 * Returns the current context value wrapped in a signal, as given by the
 * nearest context provider for the given context.
 * When the provider updates, the signal will be updated with the new value.
 *
 * @param context The context you want to use
 */
export function inject<T>(ctx: Context<T>): Reactive<T>;

/**
 * Returns a mutable ref object whose `.current` property is initialized to the passed argument
 * (`initialValue`). The returned object will persist for the full lifetime of the component.
 *
 * Note that `ref()` is useful for more than the `ref` attribute. It’s handy for keeping any mutable
 * value around similar to how you’d use instance fields in classes.
 *
 * @param initialValue the initial value to store in the ref object
 */
export function ref<T>(initialValue: T): MutableRef<T>;
export function ref<T>(initialValue: T | null): Ref<T>;
export function ref<T = undefined>(): MutableRef<T | undefined>;
