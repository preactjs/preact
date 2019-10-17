import { Component, ComponentChild } from '../../src';

//
// Suspense/lazy
// -----------------------------------
export function lazy<T>(loader: () => Promise<{default: T}>): T;

export interface SuspenseProps {
  children?: preact.ComponentChildren;
  fallback: preact.ComponentChildren;
}

export class Suspense extends Component<SuspenseProps> {
	render(): ComponentChild;
}
