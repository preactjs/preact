import { options } from 'preact';
import { assign } from '../../src/util';

/** @type {import('./internal').Component} */
let currentComponent;

let oldVNodeHook = options.vnode;
options.vnode = vnode => {
	let type = vnode.type;
	// Update the ref to forward
	if (type && type.__compositions && vnode.ref) {
		vnode.props.ref = vnode.ref;
		vnode.ref = null;
	}

	if (oldVNodeHook) oldVNodeHook(vnode);
};

let oldBeforeRender = options._render;
options._render = vnode => {
	if (oldBeforeRender) oldBeforeRender(vnode);

	/** @type {import('./internal').Component} */
	const c = (currentComponent = vnode._component);

	/** the vnode component is a uninitialized composition component */
	if (c.constructor.__compositions && !c.__compositions) {
		c.__compositions = { u: [], w: [], e: [], x: {} };
		// this could be simplified if the API change to receive `ref` in props
		// c.constructor = c.constructor(c);
		const render = c.constructor(c);
		c.constructor =
			'ref' in c.props
				? props => {
						let clone = assign({}, props);
						delete clone.ref;
						return render(clone, props.ref);
				  }
				: render;
	}

	/** the vnode component is a composition initialized component */
	if (c.__compositions)
		// call all watch
		c.__compositions.w.some(up => {
			handleEffect(up, c);
		});
};

let oldAfterDiff = options.diffed;
options.diffed = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);

	/** @type {import('./internal').Component} */
	const c = vnode._component;
	if (c && c.__compositions)
		// handle all `effect`s
		c.__compositions.e.some(up => {
			handleEffect(up, c);
		});
};

let oldBeforeUnmount = options.unmount;
options.unmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	/** @type {import('./internal').Component} */
	const c = vnode._component;
	if (c && c.__compositions) {
		// cleanup `effect`s onCleanup
		c.__compositions.e.some(cleanupEffect);
		// call all onUnmounted lifecycle callbacks
		c.__compositions.u.some(f => {
			f();
		});
	}
};

const $Reactive = Symbol('reactive');

export function createComponent(comp) {
	comp.__compositions = true;
	return comp;
}

export function memo(comparer) {
	currentComponent.shouldComponentUpdate = function(nextProps) {
		return (comparer || shallowDiffers)(this.props, nextProps);
	};
}

export function watch(src, cb, dv) {
	const vr = { value: dv };
	Object.defineProperty(vr, $Reactive, {
		get() {
			return this.value;
		}
	});
	const up = { src, cb, vr };
	handleEffect(up, currentComponent);
	currentComponent.__compositions.w.push(up);
	return vr;
}

export function effect(src, cb) {
	currentComponent.__compositions.e.push({ src, cb });
}

export function onMounted(cb) {
	currentComponent._renderCallbacks.push(cb);
}

export function onUnmounted(cb) {
	currentComponent.__compositions.u.push(cb);
}

export function provide(name, _value) {
	const c = currentComponent;
	if (!c.__compositions.c) {
		c.__compositions.c = {};
		c.getChildContext = () => c.__compositions.c;
	}
	c.__compositions.c[`__sC_${name}`] = { _component: c, _value };
}

export function inject(name, defaultValue) {
	const c = currentComponent;

	const ctx = c.context[`__sC_${name}`];
	if (!ctx) return defaultValue;

	const src = ctx._value;

	if (isReactive(src))
		ctx._component.__compositions.w.push({
			src,
			cb: () => c.forceUpdate()
		});

	return src;
}

export function reactive(value) {
	let x = value;
	const c = currentComponent;

	const reactiveProperty = {
		get() {
			return x;
		},
		set(v) {
			x = v;
			c.forceUpdate();
		}
	};
	return Object.defineProperties(
		{},
		Object.keys(value).reduce(
			(acc, key) =>
				assign(acc, {
					[key]: {
						enumerable: true,
						get() {
							return x[key];
						},
						set(v) {
							if (v !== x[key]) {
								x = assign({}, x);
								x[key] = v;
								c.forceUpdate();
							}
						}
					}
				}),
			{
				[$Reactive]: reactiveProperty,
				$value: reactiveProperty
			}
		)
	);
}

export function value(v) {
	const c = currentComponent;
	function get() {
		return v;
	}
	return Object.defineProperties(
		{},
		{
			[$Reactive]: { get },
			value: {
				get,
				set(newValue) {
					if (v !== newValue) {
						v = newValue;
						c.forceUpdate();
					}
				},
				enumerable: true
			}
		}
	);
}

export function unwrap(v) {
	return isReactive(v) ? v[$Reactive] : v;
}

export function isReactive(v) {
	return typeof v === 'object' && !!v && $Reactive in v;
}

function handleEffect(up, c) {
	const srcIsArray = Array.isArray(up.src);
	const watcher = up.vr;
	const oldArgs = up.args;
	const newArgs = srcIsArray
		? up.src.reduce((acc, s) => (acc.push(resolveArgs(s, c)), acc), [])
		: resolveArgs(up.src, c);

	if (srcIsArray ? argsChanged(oldArgs, newArgs) : oldArgs !== newArgs) {
		up.args = newArgs;

		if (watcher) {
			const value = up.cb
				? srcIsArray
					? up.cb(...newArgs)
					: up.cb(newArgs)
				: newArgs;

			if (isPromise(value))
				value.then(v => {
					watcher.value = v;
					c.forceUpdate();
				});
			else watcher.value = value;
		} else {
			cleanupEffect(up);
			if (up.cb) up.cb(newArgs, oldArgs, /* onCleanup */ cl => (up.cl = cl));
		}
	}
}

function cleanupEffect(up) {
	if (up.cl) {
		up.cl();
		up.cl = undefined;
	}
}

function resolveArgs(src, c) {
	if (src) {
		// use the value from a getter function
		if (typeof src === 'function') return src(c.props);
		// unrap the value and subscribe to the context
		if (src.Provider) return resolveContext(src, c);
		// unwrap value or reactive, returning their immutable value
		if (isReactive(src)) return src[$Reactive];
	}
	return src;
}

function resolveContext(context, c) {
	const id = context._id;
	const provider = c.context[id];
	if (provider && !c.__compositions.x[id]) {
		provider.sub(c);
		c.__compositions.x[id] = context;
	}
	return provider ? provider.props.value : context._defaultValue;
}

function argsChanged(oldArgs, newArgs) {
	return !oldArgs || newArgs.some((arg, index) => arg !== oldArgs[index]);
}

/**
 * Check if two objects have a different shape
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function shallowDiffers(a, b) {
	for (let i in a) if (i !== '__source' && !(i in b)) return true;
	for (let i in b) if (i !== '__source' && a[i] !== b[i]) return true;
	return false;
}

function isPromise(obj) {
	return (
		!!obj &&
		(typeof obj === 'object' || typeof obj === 'function') &&
		typeof obj.then === 'function'
	);
}
