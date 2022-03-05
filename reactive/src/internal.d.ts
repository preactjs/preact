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
	_value: T;
	_owner: Atom | null;
	_children: Atom[];
	_component: Component | null;
	_onUpdate: () => void;
	_context: Context<T> | null;
}

export interface Graph {
	deps: Map<Atom, Set<Atom>>;
	subs: Map<Atom, Set<Atom>>;
}

export interface Component extends PreactComponent<any, any> {
	__reactive?: Atom;
}
