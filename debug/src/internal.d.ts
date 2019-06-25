import { Component, PreactElement, VNode, Options } from "../../src/internal";
export { Component, PreactElement, VNode };

export interface Options {
	_profiling: boolean;
}

export interface InspectData {
	id: number;
	canEditHooks: boolean;
	canEditFunctionProps: boolean;
	canToggleSuspense: boolean;
	canViewSource: boolean;
	displayName: string;
	type: number;
	context: object;
	hooks: PrettyData | null;
	props: PrettyData | null;
	state: PrettyData | null;
	events: null; // TODO
	owners: any[] | null; // TODO
	source: null; // TODO
}

export interface HookInspectData {
	name: string;
	value: any;
	id: number | null;
	isStateEditable: boolean;
	subHooks: HookInspectData[];
}

export interface PrettyData {
	data: any; // TODO
	cleaned: string[];
}

export interface RendererConfig {
	/** 1 = DEV, 0 = production */
	bundleType: 1 | 0;
	/** The devtools enable different features for different versions of react */
	version: string;
	/** Informative string, currently unused in the devtools  */
	rendererPackageName: string;
	/** Find the closest DOM element given an id */
	findNativeNodesForFiberID(id: number): Array<PreactElement | HTMLElement | Text>;
	inspectElement(id: number): InspectData;
	/** Called when the user clicks on an element inside the devtools */
	selectElement(id: number): void;
	/** Called when the devtools panel is closed */
	cleanup(): void;
	/** Called when the user started a profiling session */
	startProfiling(): void;
	/** Called when the profiling session stopped */
	stopProfiling(): void;
	/** Called right after `stopProfiling` */
	getProfilingData(): ProfilingData;
	/** Called when the filter preferences are updated */
	updateComponentFilters(filters: Filter[]): void;
	/** Called when the user clicks on the log button in the props panel */
	logElementToConsole(id: number): void;
}

export interface ProfilingData {
	dataForRoots: any[];
	rendererId: number;
}

export interface Owner {
	displayName: string;
	id: number;
	type: number;
}

export type ElementFilter = {
  isEnabled: boolean,
  type: 1,
  value: number,
};

export type RegExpFilter = {
  isEnabled: boolean,
  isValid: boolean,
  type: 2 | 3,
  value: string,
};

export type BooleanFilter = {
  isEnabled: boolean,
  isValid: boolean,
  type: 4,
};

export type Filter =
  | BooleanFilter
  | ElementTypeFilter
  | RegExpFilter;

export interface PathFrame {
	key: string | null,
  index: number,
  displayName: string | null,
}

export interface PathMatch {
	id: number;
	isFullMatch: boolean;
}

export interface Renderer extends RendererConfig {
	setInState(id: number, path: string[], value: any): void;
	setTrackedPath(path: PathFrame[] | null): void;
	getPathForElement(id: number): PathFrame[] | null;
	getBestMatchForTrackedPath(): PathMatch | null;
}

export interface DevtoolsUpdater {
	setState(objOrFn: any): void;
	forceUpdate(): void;
	setInState(path: Array<string | number>, value: any): void;
	setInProps(path: Array<string | number>, value: any): void;
	setInContext(): void;
}

export type NodeType = "Composite" | "Native" | "Wrapper" | "Text";

export interface DevtoolData {
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
	data?: DevtoolData;
	internalInstance: VNode;
	renderer: string;
	type: EventType;
}

export interface DevtoolsHook {
	renderers: Map<number, any>;
	isDisabled?: boolean;
	on(ev: string, listener: () => void): void;
	emit(ev: string, data?: object): void;
	getFiberRoots(rendererId: number): Set<any>;
	inject(config: { renderer: RendererConfig, reactBuildType: number }): string;
	onCommitFiberRoot(rendererId: number, root: VNode): void;
	onCommitFiberUnmount(rendererId: number, vnode: VNode): void;
}

export interface DevtoolsHookMock extends DevtoolsHook {
	emit: DevtoolsHook['emit'] & Sinon.Spy;
	inject: DevtoolsHook['inject'] & Sinon.Spy;
}

export interface DevtoolsMock {
	hook: DevtoolsHookMock;
	connect(): void;
	applyFilters(filters: Filter[]): void;
	inspect(id: number): InspectData;
	setState(id: number, path: string[], value: any): void;
}

export interface DevtoolsWindow extends Window {
	/**
	 * If the devtools extension is installed it will inject this object into
	 * the dom. This hook handles all communications between preact and the
	 * devtools panel.
	 */
	__REACT_DEVTOOLS_GLOBAL_HOOK__?: DevtoolsHook;
	/**
	 * Custom attach function to supply a custom renderer
	 */
	__REACT_DEVTOOLS_ATTACH__?: (hook: DevtoolsHook, id: number, renderer: any, target: Window) => any;
	/**
	 * Default filtering settings.
	 */
	__REACT_DEVTOOLS_COMPONENT_FILTERS__?: Filter[];
	/**
	 * Currently selected vnode
	 */
	$r: any
}

export interface AdapterState {
	connected: boolean;
	rendererId: number;
	currentRootId: number;
	pending: any[];
	pendingUnmountIds: number[];
	pendingUnmountRootId: number | null;
	isProfiling: boolean;
	inspectedElementId: number;
	filter: {
		byType: Set<number>;
		byName: Set<RegExp>;
		byPath: Set<RegExp>;
	}
}
