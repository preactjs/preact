import { VNode, CommitProfileData } from "../internal"

export interface IdMapper {
	/** Get the unique id of a vnode */
	getId(vnode: VNode): number;
	/** Check if a vnode was seen before */
	hasId(vnode: VNode): boolean;
	/** Get a vnode by id */
	getVNode(id: number): VNode | null;
	/** Remove a vnode from the id mappings */
	remove(vnode: VNode): void;
}

export interface Linker {
	/** Add a child to a parent representing the filtered tree */
	link(child: number, parent: number): void;
	/** Remove a child from a filtered parent */
	unlink(child: number, parent: number): void;
	/** Remove oldchildren entry completely */
	remove(id: number): void;
	/** Get the previous children ids */
	get(id: number): number[];
}

export interface Profiler {
	start(): void;
	stop(): void;
	prepareCommit(rootId: number): void;
	state: {
		running: boolean;
		startTime: number;
		initial: Map<number, number>;
		durations: Map<number, number>;
		commit: CommitProfileData | null;
		data: Map<number, CommitProfileData[]>;
	};
}

export interface FilterState {
	/** The raw filters from the devtools that are applied currently */
	raw: Filter[];
	byType: Set<number>;
	byName: Set<RegExp>;
	byPath: Set<RegExp>;
}

export type StringTable = Map<string, number>;

export interface AdapterState {
	connected: boolean;
	stringTable: StringTable;
	currentRootId: number;
	/** If the devtools are not connected we store pending commits here */
	pendingCommits: number[][];
	currentCommit: Commit;
	inspectedElementId: number;
	filter: FilterState;
}

// Actions
export type RecordUnmount = (vnode: VNode) => void;
