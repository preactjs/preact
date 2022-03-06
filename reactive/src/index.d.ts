export { Fragment } from '../../';
import {
	ComponentType,
	ComponentChild,
	ComponentChildren,
	FunctionComponent,
	VNode,
	Attributes,
	ComponentClass,
	Context
} from '../../';

export interface Reactive<T> {
	value: T;
}
export type StateUpdater<S> = (value: S | ((prevState: S) => S)) => void;
export function signal<T>(
	initialValue: T,
	displayName?: string
): [Reactive<T>, StateUpdater<T>];
export function computed<T>(fn: () => T, displayName?: string): Reactive<T>;
export function effect(fn: () => T, displayName?: string): void;
export function inject<T>(ctx: Context<T>): Reactive<T>;
