import { Component as PreactComponent } from '../../src/internal';
import { Subscribeable } from './index';

export interface Subscription {
	_unsubscribe: () => void;
	_value: any;
	_component: Component;
}

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
	_onUpdate: () => void;
	_onActivate: () => void;
}

export interface Graph {
	deps: Map<Atom, Set<Atom>>;
	subs: Map<Atom, Set<Atom>>;
}

export interface Component extends PreactComponent<any, any> {
	__reactive?: {
		_list: Atom[];
	};
}
