import * as preact from '../src';

export function createRoot(container: preact.ContainerNode): {
	render(children: preact.VNode<any>): void;
	unmount(): void;
};

export function hydrateRoot(
	container: preact.ContainerNode,
	children: preact.VNode<any>
): typeof createRoot;
