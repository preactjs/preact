import { options } from 'preact';

/** @type {import('./internal').Component} */
let currentComponent;

let oldBeforeRender = options._render;
options._render = vnode => {
	if (oldBeforeRender) oldBeforeRender(vnode);

	const c = (currentComponent = vnode._component);

	const isFirst = !c.__compositions;
	if (isFirst && c.constructor.__compositions) {
		c.__compositions = { u: [], w: [], e: [], x: {} };
		c.constructor = c.constructor(getterProxy((_, p) => c.props[p]));
	}

	if (c.__compositions && !isFirst)
		// call all onMounted lifecycle callbacks
		c.__compositions.w.forEach(up => handleEffect(up, c));
};

let oldAfterDiff = options.diffed;
options.diffed = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);

	const c = vnode._component;
	if (c && c.__compositions)
		// handle all `effect`s
		c.__compositions.e.forEach(up => handleEffect(up, c));
};

let oldBeforeUnmount = options.unmount;
options.unmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	const c = vnode._component;
	if (c && c.__compositions) {
		// cleanup `effect`s onCleanup
		c.__compositions.e.forEach(cleanupEffect);
		// call all onUnmounted lifecycle callbacks
		c.__compositions.u.forEach(f => f());
	}
};

const $Reactive = Symbol('reactive');

export function createComponent(comp) {
	comp.__compositions = true;
	return comp;
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
	currentComponent.__compositions.e.push({ cb });
}

export function onUnmounted(cb) {
	currentComponent.__compositions.u.push(cb);
}

export function provide(name, _value) {
	const _component = currentComponent;
	if (!_component.__compositions.c) {
		_component.__compositions.c = {};
		_component.getChildContext = () => _component.__compositions.c;
	}
	_component.__compositions.c[`__sC_${name}`] = { _component, _value };
}

export function inject(name, defaultValue) {
	const c = currentComponent;

	const ctx = c.context[`__sC_${name}`];
	if (!ctx) return defaultValue;

	const src = ctx._value;

	if (isReactive(src))
		ctx._component.__compositions.w.push({ src, cb: () => c.setState({}) });

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
			c.setState({});
		}
	};
	return Object.defineProperties(
		{},
		Object.keys(value).reduce(
			(acc, key) =>
				Object.assign(acc, {
					[key]: {
						enumerable: true,
						get() {
							return x[key];
						},
						set(v) {
							if (v !== x[key]) {
								x = Object.assign({}, x);
								x[key] = v;
								c.setState({});
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

export function ref(v) {
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
						c.setState({});
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

function handleEffect(up, c, init) {
	// handle onMounted
	if (!up.src && up.cb) {
		if (!up.args) {
			up.cb();
			up.args = [];
		}
		return;
	}

	const srcIsArray = Array.isArray(up.src);
	let newArgs = srcIsArray
		? up.src.reduce((acc, s) => acc.concat(resolveArgs(s, c)), [])
		: resolveArgs(up.src, c, init);

	if (srcIsArray ? argsChanged(up.args, newArgs) : up.args !== newArgs) {
		cleanupEffect(up);
		const r = up.cb
			? up.cb(newArgs, up.args, /* onCleanup */ cl => (up.cl = cl))
			: newArgs;
		up.args = newArgs;
		if (up.vr) {
			if (isPromise(r))
				r.then(v => {
					up.vr.value = v;
					c.setState({});
				});
			else up.vr.value = r;
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
		// unwrap ref or reactive, returning their immutable value
		if (isReactive(src)) return src[$Reactive];
		// is src a createRef holding a element, return the current
		if (isPlainObject(src) && 'current' in src) return src.current;
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

function getterProxy(get) {
	return new Proxy(
		{},
		{
			get
			// getOwnPropertyDescriptor: () => ({ configurable: false })
		}
	);
}

function isPlainObject(obj) {
	return obj && obj.constructor === Object;
}

function isPromise(obj) {
	return (
		!!obj &&
		(typeof obj === 'object' || typeof obj === 'function') &&
		typeof obj.then === 'function'
	);
}
