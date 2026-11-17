import { Component, ComponentChild, ComponentChildren } from '../../src/index';

//
// Suspense/lazy
// -----------------------------------
export function lazy<T>(
	loader: () => Promise<{ default: T } | T>
): T extends { default: infer U } ? U : T;

export interface SuspenseProps {
	children?: ComponentChildren;
	fallback: ComponentChildren;
	/** A stable, unique name for useId calls during resumed hydration. */
	name?: string;
}

export class Suspense extends Component<SuspenseProps> {
	render(): ComponentChild;
}
