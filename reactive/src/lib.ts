import { AtomKind } from './internal';

export interface Reader<T> {
	(): T;
	_atom: Atom<T>;
}
export type Updater<T> = (nextValue: T | ((prev: T) => T | null)) => void;

export interface Atom<T = unknown> {
	_pending: number;
	_execute: () => boolean;
	_flags: number;
	_value: T;
	_nextValue: T;
	_subscriptions: Set<Atom<unknown>>;
	_dependencies: Set<Atom<unknown>>;
}

const NOOP = () => false;

const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;

export function newAtom<T = unknown>(fn: () => boolean, kind: number): Atom<T> {
	return {
		_pending: 0,
		_execute: fn,
		_flags: kind,
		_value: undefined,
		_nextValue: undefined,
		_subscriptions: new Set(),
		_dependencies: new Set()
	};
}

const FLAG_KIND_SOURCE = 0;
const FLAG_KIND_MEMO = 1;
const FLAG_KIND_REACTION = 1 << 1;
const FLAG_STALE = 1 << 2;

const ROOT = newAtom(NOOP, FLAG_KIND_MEMO);
let running: Atom = ROOT;
let batchMode = false;
let updateQueue: Atom[] = [];

function enqueueUpdate(atom: Atom) {
	if (updateQueue.push(atom) && !batchMode) {
		processUpdate();
	}
}

function processUpdate() {
	const q = updateQueue;
	updateQueue = [];

	let stack = q.slice();
	let item;
	while ((item = stack.pop()) !== undefined) {
		if (++item._pending === 1) {
			item._subscriptions.forEach(s => stack.push(s));
		}
	}

	stack = q.slice();
	while ((item = stack.pop()) !== undefined) {
		if (--item._pending === 0) {
			if (item._execute()) {
				item._subscriptions.forEach(s => stack.push(s));
			} else {
				// unmark current tree
				const unmarkStack = [item];
				let unmarkItem;
				while ((unmarkItem = unmarkStack.pop()) !== undefined) {
					if (--unmarkItem._pending === 0) {
						unmarkItem._subscriptions.forEach(s => unmarkItem.push(s));
					}
				}
			}
		}
	}
}

function subscribe(atom: Atom) {
	running._dependencies.add(atom);
	atom._subscriptions.add(running);
}

export function createSignal<T>(value: T): [Reader<T>, Updater<T>] {
	const updater = () => {
		atom._value = atom._nextValue;
		return true;
	};
	const atom = newAtom<any>(updater, FLAG_KIND_SOURCE);
	atom._value = atom._nextValue = value;

	const read: Reader<T> = () => {
		subscribe(atom);
		return atom._value;
	};
	read._atom = atom;

	const write = nextValue => {
		if (atom._value !== nextValue) {
			atom._nextValue = nextValue;
			enqueueUpdate(atom);
		}
	};

	return [read, write];
}

function cleanup(atom: Atom) {
	atom._dependencies.forEach(dep => {
		dep._subscriptions.delete(atom);
		if (dep._subscriptions.size === 0) {
			dep._flags |= FLAG_STALE;
			cleanup(dep);
		}
	});
	atom._dependencies.clear();
}

function trackFn<T>(atom: Atom<T>, fn: () => T) {
	cleanup(atom);
	const tmp = running;
	running = atom;
	try {
		return fn();
	} finally {
		running = tmp;
	}
}

export function createEffect(fn: () => void) {
	const execute = () => {
		trackFn(atom, fn);
		return true;
	};
	const atom = newAtom<void>(execute, FLAG_KIND_REACTION);
	execute();
}

export function createMemo<T>(fn: () => T): Reader<T> {
	const execute = () => {
		const result = trackFn(atom, fn);
		if (atom._value !== result) {
			atom._value = result;
			return true;
		}

		return false;
	};

	const atom = newAtom<T>(execute, FLAG_KIND_MEMO);
	atom._flags |= FLAG_STALE;

	const read = () => {
		subscribe(atom);
		if (atom._flags & FLAG_STALE) {
			atom._flags ^= FLAG_STALE;
			execute();
		}
		return atom._value;
	};
	read._atom = atom;
	return read;
}

export function untrack<T>(fn: () => T): T {
	const tmp = running;
	running = null;
	const value = fn();
	running = tmp;
	return value;
}

export function batch(fn: () => void): void {
	batchMode = true;
	fn();
	batchMode = false;
	processUpdate();
}

function isPromise(x: any): x is Promise<unknown> {
	return typeof x === 'object' && typeof x.then === 'function';
}

export function getResource<T, V = unknown>(
	signal: Reader<T>,
	fn: (value: T, controller: AbortController) => V | Promise<V>
): {
	value: Reader<V | null>;
	loading: Reader<boolean>;
	error: Reader<Error | null>;
} {
	let controller: AbortController | undefined;
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<Error | null>(null);

	const execute = () => {
		if (controller !== undefined) {
			controller.abort();
		}

		controller = new AbortController();
		console.log(new Error().stack);
		console.log('exec');

		try {
			const p = fn(signal._atom._value, controller);
			if (isPromise(p)) {
				setLoading(true);
				p.then(res => {
					setLoading(false);
					if (!controller.signal.aborted) {
						atom._nextValue = res;
						enqueueUpdate(atom);
					}
				}).catch(err => {
					setLoading(false);
					if (!(err instanceof Error) || err.name === 'AbortError') {
						setError(err);
					}
				});
			} else if (!controller.signal.aborted) {
				atom._nextValue = p;
				enqueueUpdate(atom);
			}
		} catch (err) {
			setError(err);
		}

		return false;
	};

	const atom = newAtom<V>(execute, FLAG_KIND_MEMO);
	atom._value = null;
	// signal._atom._subscriptions.add(atom);
	// atom._dependencies.add(signal._atom);

	atom._flags |= FLAG_STALE;

	const reader: Reader<V | null> = () => {
		subscribe(atom);
		if (atom._flags & FLAG_STALE) {
			atom._flags ^= FLAG_STALE;
			execute();
		}
		return atom._value;
	};
	reader._atom = atom;
	return { loading, value: reader, error };
}
