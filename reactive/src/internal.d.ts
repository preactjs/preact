import { Component as PreactComponent } from '../../src/internal';
import { Context } from '../../src/index';

export enum AtomKind {
	SOURCE = 1,
	COMPUTED = 2,
	REACTION = 3
}

export type UpdateFn<T> = (value: T) => T | null;

export interface Atom<T = any> {
	displayName: string;
	kind: AtomKind;
	getValue(): T;
	setValue(value: T | UpdateFn<T>): void;
	_pending: number;
	_value: T;
	_tracking: Set<Atom> | undefined;
	_owner: Atom | undefined;
	_children: Atom[];
	_component: Component | undefined;
	_onUpdate: () => void;
	_onCleanup: () => void;
	_context: Context<T> | undefined;
}

export interface Graph {
	deps: Map<Atom, Set<Atom>>;
	subs: Map<Atom, Set<Atom>>;
}

export interface EffectState {
	_atom: Atom;
	_fn: () => (() => void) | undefined;
}

export interface Component extends PreactComponent<any, any> {
	__reactive?: {
		_atom: Atom;
		_pendingEffects: EffectState[];
	};
}
