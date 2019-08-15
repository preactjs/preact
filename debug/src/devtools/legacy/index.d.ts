import { RendererConfigBase } from '../../internal';

export { VNode, Component, PreactElement } from '../../internal';

//
// Legacy devtools version (v3)
//
export type NodeType = "Composite" | "Native" | "Wrapper" | "Text";

export interface LegacyRendererConfig  extends RendererConfigBase {
	/** Find the root dom node of a vnode */
	findHostInstanceByFiber(vnode: VNode): HTMLElement | null;
	/** Find the closest vnode given a dom node */
	findFiberByHostInstance(instance: HTMLElement): VNode | null;
}

export interface LegacyDevtoolsHook {
	_renderers: Record<string, any>;
	_roots: Set<VNode>;
	isDisabled?: boolean;
	helpers: Record<string, any>;
	on(ev: string, listener: () => void): void;
	emit(ev: string, data?: object): void;
	getFiberRoots(rendererId: string): Set<any>;
	inject(config: DevtoolsInjectOptions): string;
	onCommitFiberRoot(rendererId: string, root: VNode): void;
	onCommitFiberUnmount(rendererId: string, vnode: VNode): void;
}

export interface LegacyRendererConfig  extends RendererConfigBase {
	/** Find the root dom node of a vnode */
	findHostInstanceByFiber(vnode: VNode): HTMLElement | null;
	/** Find the closest vnode given a dom node */
	findFiberByHostInstance(instance: HTMLElement): VNode | null;
}

export interface LegacyDevtoolData {
	nodeType: NodeType;
	// Component type
	type: any;
	name: string;
	ref: any;
	key: string | number;
	updater: DevtoolsUpdater | null;
	text: string | number | null;
	state: any;
	props: any;
	children: VNode[] | string | number | null;
	publicInstance: PreactElement | Text | Component;
	memoizedInteractions: any[];

	actualDuration: number,
	actualStartTime: number,
	treeBaseDuration: number,
}

export type EventType = 'unmount' | 'rootCommitted' | 'root' | 'mount' | 'update' | 'updateProfileTimes';

export interface DevtoolsEvent {
	data?: LegacyDevtoolData;
	internalInstance: VNode;
	renderer: string;
	type: EventType;
}

export type InstanceCache = WeakMap<Component, PreactElement | VNode | HTMLElement | Text>;
