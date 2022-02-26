import { Component as PreactComponent } from '../../src/internal';
import { Atom } from './index';

export interface Subscription {
	_unsubscribe: () => void;
	_value: any;
	_component: Component;
}

export interface Component extends PreactComponent<any, any> {
	__reactive?: {
		_atoms: Map<Atom<any>, Subscription>;
		_prevAtoms: Map<Atom<any>, Subscription>;
	};
}
