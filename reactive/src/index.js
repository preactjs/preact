import { options, Component, h } from 'preact';

/** @type {number} */
let currentIndex;

/** @type {import('./internal').Atom} */
let currentAtom;

/** @type {import('./internal').Component} */
let currentComponent;

// TODO: Process writes in a queue similar to
// component state updates (would add batching by default)
// Is this bad for inputs?

/** @type {import('./internal').AtomKind.SOURCE} */
const KIND_SOURCE = 1;
/** @type {import('./internal').AtomKind.COMPUTED} */
const KIND_COMPUTED = 2;
/** @type {import('./internal').AtomKind.REACTION} */
const KIND_REACTION = 3;

let oldBeforeUnmount = options.unmount;
options.unmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	/** @type {import('./internal').Component | null} */
	const c = vnode._component;
	if (c && c.__reactive) {
		const list = c.__reactive._children;
		let i = list.length;
		while (i--) {
			destroy(list[i]);
		}
	}
};

/**
 * @template T
 * @param {T} initialState
 * @param {number} index
 * @param {import('./internal').AtomKind} kind
 * @param {string} [displayName]
 * @returns {import('./internal').Atom<T>}
 */
function getAtom(index, initialState, kind, displayName) {
	const reactive = currentAtom;

	if (index >= reactive._children.length) {
		const atom = createAtom(initialState, kind, displayName);
		reactive._children.push(atom);
		atom._owner = currentAtom;
	}

	return reactive._children[index];
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
	/** @type {import('./internal').Atom<T>} */
	const atom = {
		displayName: displayName + '_' + String(atomHash++),
		kind,
		_pending: 0,
		_onUpdate: NOOP,
		_value: initialValue,
		_owner: null,
		_context: null,
		_component: currentComponent,
		_children: [], // TODO: Use empty array for signals?
		get value() {
			tracking.add(atom);

			if (kind !== KIND_SOURCE && !graph.deps.has(atom)) {
				atom._onUpdate();
			}

			return this._value;
		}
	};

	return atom;
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
		item._owner = null;

		const deps = graph.deps.get(item);
		if (deps) {
			deps.forEach(dep => {
				unlinkDep(item, dep);
				stack.push(dep);
			});
		}

		if (item._children.length > 0) {
			stack.push(...item._children);
		}
	}
}

/**
 * @param {import('./internal').Atom} atom
 */
function flagUpdate(atom) {
	if (++atom._pending === 1) {
		const subs = graph.subs.get(atom);
		if (subs !== undefined) {
			subs.forEach(flagUpdate);
		}
	}
}

/**
 * @param {import('./internal').Atom} atom
 */
function unflagUpdate(atom) {
	if (--atom._pending === 0) {
		const subs = graph.subs.get(atom);
		if (subs !== undefined) {
			subs.forEach(unflagUpdate);
		}
	}
}

/**
 * @param {import('./internal').Atom} atom
 */
function processUpdate(atom) {
	if (--atom._pending === 0) {
		if (atom._onUpdate !== NOOP) {
			atom._onUpdate();
		}

		const subs = graph.subs.get(atom);
		if (subs) {
			subs.forEach(processUpdate);
		}
	}
}

/**
 * Prevent so-called "glitches" where an atom could be derived from stale
 * dependencies by sorting them. The algorithm is taken from MobX and is
 * explained here: https://youtu.be/NBYbBbjZeX4?t=2979
 * @template T
 * @param {import('./internal').Atom<T>} atom
 */
function invalidate(atom) {
	flagUpdate(atom);
	processUpdate(atom);
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
	const atom = getAtom(currentIndex++, initialValue, KIND_SOURCE, displayName);

	/** @type {import('./index').StateUpdater<T>} */
	const updater = value => {
		// TODO: Extract to preact/debug?
		if (currentAtom !== undefined && currentAtom.kind === KIND_COMPUTED) {
			throw new Error('Must not update signal inside computed.');
		}

		if (isUpdater(value)) {
			const res = value(atom._value);
			if (res !== null && res !== atom._value) {
				atom._value = res;
				invalidate(atom);
			}
		} else if (atom._value !== value) {
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
	let tmpAtom = currentAtom;
	currentAtom = atom;
	let prevIndex = currentIndex;
	currentIndex = 0;

	try {
		const res = fn();
		if (atom._value === res) {
			const subs = graph.subs.get(atom);
			if (subs !== undefined) {
				subs.forEach(unflagUpdate);
			}
		}

		atom._value = res;
		return res;
	} catch (e) {
		options._catchError(e, atom._component._vnode);
	} finally {
		let deps = graph.deps.get(atom);
		if (!deps) {
			deps = new Set();
			graph.deps.set(atom, deps);
		}

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

		currentAtom = tmpAtom;
		tracking = tmp;
		currentIndex = prevIndex;
	}
}

/**
 * @template T
 * @param {() => T} fn
 * @param {string} [displayName]
 * @returns {import('./internal').Atom<T>}
 */
export function computed(fn, displayName) {
	const atom = getAtom(currentIndex++, undefined, KIND_COMPUTED, displayName);
	atom._onUpdate = () => track(atom, fn);
	return atom;
}

/**
 * @template T
 * @param {import('preact').Context<T>} context
 * @returns {import('./internal').Atom<T>}
 */
export function inject(context) {
	const atom = getAtom(
		currentIndex++,
		undefined,
		KIND_COMPUTED,
		'inject_' + (context.displayName || 'unknown')
	);

	const provider = currentComponent.context[context._id];

	// The devtools needs access to the context object to
	// be able to pull of the default value when no provider
	// is present in the tree.
	atom._context = context;
	if (!provider) {
		atom._value = context._defaultValue;
		return atom;
	}

	// This is probably not safe to convert to "!"
	if (atom._value == null) {
		atom._value = provider.props.value;

		class InjectedContext extends Component {
			render() {
				atom._value = provider.props.value;
				const subs = graph.subs.get(atom);
				if (subs && subs.size > 0) {
					invalidate(atom);
				}
				return null;
			}
		}

		const vnode = h(InjectedContext, {});

		const c = new InjectedContext({});
		c._force = false;
		c._vnode = vnode;
		c._parentDom = currentComponent._parentDom;
		c._children = [];
		c._renderCallbacks = [];
		vnode._component = c;
		provider.sub(c);
	}

	return atom;
}

/**
 * @template P
 * @param {(props: P) => () => import('../../src/index').ComponentChild} fn
 * @returns {import('../../src/index').ComponentChild}
 */
export function component(fn) {
	return function Reactive(props) {
		let prevCurrentComponent = currentComponent;
		currentComponent = this;
		// Similar to reaction(), but the difference is that we
		// attach the atom to the component instance.
		const atom =
			this.__reactive ||
			(this.__reactive = createAtom(
				null,
				KIND_REACTION,
				this.displayName || fn.name || 'ReactiveComponent'
			));

		atom._onUpdate = () => {
			this.setState({});
		};

		try {
			return track(atom, () => fn(props));
		} finally {
			currentComponent = prevCurrentComponent;
		}
	};
}
