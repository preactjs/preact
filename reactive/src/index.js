import { options } from 'preact';

/** @type {number} */
let currentIndex;

/** @type {import('./internal').Component} */
let currentComponent;

// TODO: Process writes in a queue similar to
// component state updates (would add batching by default)
// Is this bad for inputs?

let oldBeforeDiff = options._diff;
let oldBeforeRender = options._render;
let oldAfterDiff = options.diffed;
let oldBeforeUnmount = options.unmount;

/** @type {import('./internal').AtomKind.SOURCE} */
const KIND_SOURCE = 1;
/** @type {import('./internal').AtomKind.COMPUTED} */
const KIND_COMPUTED = 2;
/** @type {import('./internal').AtomKind.REACTION} */
const KIND_REACTION = 3;

options._diff = vnode => {
	currentComponent = null;
	if (oldBeforeDiff) oldBeforeDiff(vnode);
};

options._render = vnode => {
	if (oldBeforeRender) oldBeforeRender(vnode);

	currentComponent = vnode._component;
	currentIndex = 0;
};

options.diffed = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);
	currentComponent = null;
};

options.unmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	/** @type {import('./internal').Component | null} */
	const c = vnode._component;
	if (c && c.__reactive) {
		const list = c.__reactive._list;
		let i = list.length;
		while (i--) {
			destroy(list[i]);
		}
	}
};

function getReactiveState() {
	return (
		currentComponent.__reactive ||
		(currentComponent.__reactive = {
			_list: []
		})
	);
}

/**
 * @template T
 * @param {T} initialState
 * @param {number} index
 * @param {import('./internal').AtomKind} kind
 * @param {string} [displayName]
 * @returns {import('./internal').Atom<T>}
 */
function getAtomState(index, initialState, kind, displayName) {
	const reactive = getReactiveState();

	if (index >= reactive._list.length) {
		reactive._list.push(createAtom(initialState, kind, displayName));
	}
	return reactive._list[index];
}

/**
 * @type {import('./internal').Graph}
 */
const graph = {
	deps: new Map(),
	subs: new Map()
};

/**
 * @type {Set<import('./internal').Atom>}
 */
let tracking = new Set();

const NOOP = () => {};

let atomHash = 0;

/**
 * @template T
 * @param {T} initialValue
 * @param {import('./internal').AtomKind} kind
 * @returns {import('./internal').Atom<T>}
 */
function createAtom(initialValue, kind, displayName = '') {
	const state = {
		displayName: displayName + '_' + String(atomHash++),
		kind,
		_onUpdate: NOOP,
		_value: initialValue,
		get value() {
			tracking.add(state);
			return this._value;
		}
	};

	return state;
}

/**
 * Set up reactive graph, but don't subscribe to it
 * @param {import('./internal').Atom} atom
 * @param {import('./internal').Atom} dep
 */
function linkDep(atom, dep) {
	let subs = graph.subs.get(dep);
	if (!subs) {
		subs = new Set();
		graph.subs.set(dep, subs);
	}

	subs.add(atom);

	let deps = graph.deps.get(atom);
	if (!deps) {
		deps = new Set();
		graph.deps.set(atom, deps);
	}

	deps.add(dep);
}

/**
 * @param {import('./internal').Atom} atom
 * @param {import('./internal').Atom} dep
 */
function unlinkDep(atom, dep) {
	const subs = graph.subs.get(dep);
	if (subs) {
		subs.delete(atom);
	}

	const deps = graph.deps.get(atom);
	if (deps) {
		deps.delete(dep);
	}
}

/**
 * @param {import('./internal').Atom} atom
 */
function destroy(atom) {
	const stack = [atom];
	let item;
	while ((item = stack.pop()) !== undefined) {
		const deps = graph.deps.get(item);
		if (deps) {
			deps.forEach(dep => {
				unlinkDep(item, dep);
				stack.push(dep);
			});
		}
	}
}

/**
 * @template T
 * @param {import('./internal').Atom<T>} atom
 */
function invalidate(atom) {
	if (atom._onUpdate !== NOOP) {
		atom._onUpdate();
	}

	const subs = graph.subs.get(atom);
	if (subs) {
		subs.forEach(invalidate);
	}
}

/**
 * @param {*} x
 * @returns {x is import('./index').StateUpdater<any>}
 */
function isUpdater(x) {
	// Will be inlined by terser
	return typeof x === 'function';
}

/**
 * @template T
 * @param {T} initialValue
 * @param {string} [displayName]
 * @returns {[import('./index').Reactive<T>,import('./index').StateUpdater<T>]}
 */
export function signal(initialValue, displayName) {
	const atom = getAtomState(
		currentIndex++,
		initialValue,
		KIND_SOURCE,
		displayName
	);

	/** @type {import('./index').StateUpdater<T>} */
	const updater = value => {
		if (isUpdater(value)) {
			const res = value(atom._value);
			if (res !== null && res !== atom._value) {
				atom._value = res;
				invalidate(atom);
			}
		} else {
			atom._value = value;
			invalidate(atom);
		}
	};

	return [atom, updater];
}

/**
 * @template T
 * @param {import('./internal').Atom<T>} atom
 * @param {() => T} fn
 * @returns {T}
 */
function track(atom, fn) {
	let tmp = tracking;
	tracking = new Set();

	try {
		const res = fn();
		atom._value = res;
		return res;
	} finally {
		let deps = graph.deps.get(atom);

		// Subscribe to new subscriptions
		tracking.forEach(dep => {
			linkDep(atom, dep);
		});

		// Remove old subscriptions
		deps.forEach(dep => {
			if (!tracking.has(dep)) {
				unlinkDep(atom, dep);
			}
		});

		tracking = tmp;
	}
}

/**
 * @template T
 * @param {() => T} fn
 * @param {string} [displayName]
 * @returns {import('./internal').Atom<T>}
 */
export function computed(fn, displayName) {
	const state = getAtomState(
		currentIndex++,
		undefined,
		KIND_COMPUTED,
		displayName
	);
	state._onUpdate = () => track(state, fn);
	return state;
}

/**
 * @template T
 * @param {() => T} fn
 * @param {(value: T) => void} cb
 * @param {string} [displayName]
 * @returns {T}
 */
function reactive(fn, cb, displayName) {
	const atom = getAtomState(
		currentIndex++,
		undefined,
		KIND_REACTION,
		displayName
	);
	atom._onUpdate = () => {
		track(atom, fn);
		cb(atom._value);
	};

	if (!graph.deps.has(atom)) {
		graph.deps.set(atom, new Set());
		atom._onUpdate();
	}

	return atom._value;
}

/**
 * @template P
 * @param {(props: P) => () => import('../../src/index').ComponentChild} fn
 * @returns {import('../../src/index').ComponentChild}
 */
export function component(fn) {
	return function Reactive(props) {
		const view = fn(props);
		return reactive(
			view,
			() => this.setState({}),
			this.displayName || fn.name || 'ReactiveComponent'
		);
	};
}
