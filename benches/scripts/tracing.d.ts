// From: https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview

export type TraceEvent =
	| DurationEvent
	| CompleteEvent
	| InstantEvent
	| AsyncEvent
	| FlowEvent
	| SampleEvent
	| ProcessNameEvent
	| ProcessLabelsEvent
	| ProcessSortIndexEvent
	| ThreadNameEvent
	| ThreadSortIndexEvent
	| MarkEvent
	| ContextEvent
	| ObjectCreatedEvent
	| ObjectSnapshotEvent
	| ObjectDestroyedEvent;

interface BaseEvent {
	/** The name of the event */
	name: string;
	/**
	 * The event categories. This is a comma separated list of categories for the
	 * event.
	 */
	cat: string;
	/** The event type (phase?) */
	ph: string;
	/** The tracing clock timestamp (microseconds) */
	ts: number;
	/** The thread clock timestamp of the event (microseconds) */
	tts?: number;
	/** Process ID */
	pid: number;
	/** Thread ID */
	tid: number;
	/** Any args provided for the event */
	args: Record<string, any>;
}

interface StackData {
	/**
	 * Stack frame at the start of the event. ID pointing the corresponding stack
	 * in the stackFrames map
	 */
	sf?: number;
	/**
	 * Stack at the start of the event. Usually contains program counter addresses
	 * as hex strings
	 */
	stack?: string[];
}

/** Mark the beginning or end of a duration of work on a given thread */
interface DurationEvent extends BaseEvent, StackData {
	ph: 'B' | 'E';
}

/** Represents a duration of work on a given thread */
interface CompleteEvent extends BaseEvent, StackData {
	ph: 'X';
	/** Tracing clock duration (microseconds) */
	dur: number;
	/** Thread clock duration? (microseconds) */
	tdur?: number;
	/** Stack frame at the end of this event */
	esf?: number;
	/** Stack at the end of this event */
	estack?: string[];
}

/**
 * Mark something happened but has no duration associated with it. Only threaded
 * scoped events can have stack data associated with them.
 */
interface InstantEvent extends BaseEvent, StackData {
	ph: 'i' | 'I';
	/** Scope of the event. g = global, p = process, t = thread (default) */
	s?: 'g' | 'p' | 't';
}

/**
 * Async operations (e.g. frames in a game, network I/O). b = start, n =
 * instant, e = end. Events with the same category, id, and scope (if provided)
 * are considered events from the same event tree. Nested async events should
 * have the same category and id as its parent (but perhaps a different name).
 */
interface AsyncEvent extends BaseEvent {
	ph: 'b' | 'n' | 'e';
	id: string;
	scope?: string;
}

/**
 * Similar to Async events but allows a duration to be associated with each
 * other across threads/processes. Visually, think of a flow event as an arrow
 * between two duration events. With flow events, each event will be drawn in
 * the thread it is emitted from. The events will be linked together visually
 * using lines and arrows.
 *
 * TODO: Finish filling out
 */
interface FlowEvent extends BaseEvent {
	ph: 's' | 't' | 'f';
}

interface SampleEvent extends BaseEvent, StackData {
	ph: 'P';
}

interface ProcessNameEvent extends BaseEvent {
	ph: 'M';
	name: 'process_name';
	args: {
		name: string;
	};
}

interface ProcessLabelsEvent extends BaseEvent {
	ph: 'M';
	name: 'process_labels';
	args: {
		labels: string;
	};
}

interface ProcessSortIndexEvent extends BaseEvent {
	ph: 'M';
	name: 'process_sort_index';
	args: {
		sort_index: number;
	};
}

interface ProcessUptimeEvent extends BaseEvent {
	ph: 'M';
	name: 'process_uptime_seconds';
	args: {
		uptime: number;
	};
}

interface ThreadNameEvent extends BaseEvent {
	ph: 'M';
	name: 'thread_name';
	args: {
		name: string;
	};
}

interface ThreadSortIndexEvent extends BaseEvent {
	ph: 'M';
	name: 'thread_sort_index';
	args: {
		sort_index: number;
	};
}

interface NumCPUsEvent extends BaseEvent {
	ph: 'M';
	name: 'num_cpus';
	args: {
		number: number;
	};
}

/**
 * Mark events are created whenever a corresponding navigation timing API mark
 * is created
 */
interface MarkEvent extends BaseEvent {
	ph: 'R';
}

/**
 * Context events are used to mark sequences of trace events as belonging to a
 * particular context (or a tree of contexts). "(" = enter context, ")" = exit
 * context. The enter event adds a context to all following trace events on the
 * same thread until a corresponding leave event exits that context. Context ids
 * refer to context object snapshots.
 */
interface ContextEvent extends BaseEvent {
	ph: '(' | ')';
	id?: string;
}

/** Object was created. Time is inclusive */
interface ObjectCreatedEvent extends BaseEvent {
	ph: 'N';
	id: string;
	scope?: string;
	args: undefined;
}

interface ObjectSnapshotEvent extends BaseEvent {
	ph: 'O';
	id: string;
	scope?: string;
	args: {
		/**
		 * By default, an object snapshot inherits the category of its containing
		 * trace event. However, sometimes the object being snapshotted needs its
		 * own category. This happens because the place that creates an object
		 * snapshot's values is often separate form where the objects' constructor
		 * and destructor is called. Categories for the object creation and deletion
		 * commands must match the snapshot commands. Thus, the category of any
		 * object snapshot may be provided with the snapshot itself
		 */
		cat?: string;
		/** Name of base type object */
		base_type?: string;
		snapshot: any;
	};
}

/** Object was destroyed. Time is exclusive */
interface ObjectDestroyedEvent extends BaseEvent {
	ph: 'D';
	id: string;
	scope?: string;
	args: undefined;
}
