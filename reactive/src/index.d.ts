export { Fragment } from '../../';
import {
	ComponentType,
	ComponentChild,
	ComponentChildren,
	FunctionComponent,
	VNode,
	Attributes
} from '../../';
import { JSXInternal } from '../../src/jsx';

export interface Atom<T> {
	subscribe(fn: (value: T) => void): () => void;
}

export function $<T>(atom: Atom<T>): T;

export function component<P = {}>(
	fn: (initialProps: P, get: <T>(atom: Atom<T>) => T) => FunctionComponent<P>
): any;
