import { Component } from '../../src';

//
// Suspense/lazy
// -----------------------------------
export function lazy<T>(loader: () => Promise<{default: T}>): T;

export interface SuspenseProps {
  children?: preact.ComponentChildren;
  fallback: preact.ComponentChildren;
}

export abstract class Suspense extends Component<SuspenseProps> {}
