import { Component, ComponentChild } from '../../src';

//
// SuspenseList
// -----------------------------------

export interface SuspenseListProps {
	children?: preact.ComponentChildren;
	revealOrder?: 'forwards' | 'backwards' | 'together';
}

export class SuspenseList extends Component<SuspenseListProps> {
	render(): ComponentChild;
}
