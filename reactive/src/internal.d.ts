import { Component as PreactComponent } from '../../src/internal';
import { Context } from '../../src/index';

export enum AtomKind {
	SOURCE = 1,
	COMPUTED = 2,
	REACTION = 3
}

export interface Atom<T = any> {
	displayName: string;
	kind: AtomKind;
	value: T;
	_pending: number;
	_value: T;
	_tracking: Set<Atom> | undefined;
	_owner: Atom | undefined;
	_children: Atom[];
	_component: Component | undefined;
	_onUpdate: () => void;
	_context: Context<T> | undefined;
}

export interface Graph {
	deps: Map<Atom, Set<Atom>>;
	subs: Map<Atom, Set<Atom>>;
}

export interface Component extends PreactComponent<any, any> {
	__reactive?: {
		_atom: Atom;
		_pendingEffects: any[];
	};
}
