export interface SerializedVNode {
	type: 'vnode';
	name: string;
}

export interface RawFilterState {
	regex: string[];
	type: {
		fragment: boolean;
		dom: boolean;
	};
}

export interface FilterState {
	regex: RegExp[];
	type: Set<string>;
}

export type UpdateType = 'props' | 'context' | 'state';

export interface Renderer {
	getVNodeById(id: ID): VNode | null;
	getDisplayName(vnode: VNode): string;
	findDomForVNode(id: ID): Array<HTMLElement | Text | null> | null;
	findVNodeIdForDom(node: HTMLElement | Text): number;
	applyFilters(filters: FilterState): void;
	has(id: ID): boolean;
	log(id: ID, children: ID[]): void;
	inspect(id: ID): InspectData | null;
	onCommit(vnode: VNode): void;
	onUnmount(vnode: VNode): void;
	flushInitial(): void;
	forceUpdate(id: ID): void;
	update(id: ID, type: UpdateType, path: ObjPath, value: any): void;
}

export interface InspectData {
	id: ID;
	name: string;
	type: any;
	context: Record<string, any> | null;
	canEditHooks: boolean;
	hooks: any | null;
	canEditProps: boolean;
	props: Record<string, any> | null;
	canEditState: boolean;
	state: Record<string, any> | null;
}

export type EmitterFn = (event: string, data: any) => void;

export interface DevtoolEvents {
	'update-prop': { id: ID; path: ObjPath; value: any };
	'update-state': { id: ID; path: ObjPath; value: any };
	'update-context': { id: ID; path: ObjPath; value: any };
	'force-update': ID;
	'start-picker': null;
	'stop-picker': null;
	'update-filter': RawFilterState;
	copy: string;
	highlight: ID | null;
	log: { id: ID; children: ID[] };
	inspect: ID;
}

export type Path = Array<string | number>;

export interface DevtoolsEvent {
	name: string;
	data: any;
}

export type EmitFn = <K extends keyof DevtoolEvents>(
	name: K,
	data: DevtoolEvents[K]
) => void;

export interface PreactDevtoolsHook {
	connected: boolean;
	emit: EmitterFn;
	renderers: Map<number, Renderer>;
	attach(renderer: Renderer): number;
	detach(id: number): void;
}

export type StringTable = Map<string, number>;

export interface Commit {
	rootId: number;
	strings: StringTable;
	unmountIds: number[];
	operations: number[];
}

export interface IdMapper {
	getVNode(id: number): VNode | null;
	has(id: number): boolean;
	hasId(vnode: VNode): boolean;
	createId(vnode: VNode): number;
	getId(vnode: VNode): number;
	update(id: number, vnode: VNode): void;
	remove(vnode: VNode): void;
}

export interface ParsedMsg {
	rootId: number;
	mounts: Array<{ id: ID; key: string; name: string; parentId: ID }>;
	unmounts: ID[];
	reorders: Array<{ id: ID; children: ID[] }>;
	timings: Array<{ id: ID; duration: number }>;
}
