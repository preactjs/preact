import { options } from "preact";

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
		c.__compositions.w.forEach(up => handleEffect(up, c));
};

let oldAfterDiff = options.diffed;
options.diffed = vnode => {
	if (oldAfterDiff) oldAfterDiff(vnode);

	const c = vnode._component;
	if (c && c.__compositions)
		c.__compositions.e.forEach(up => handleEffect(up, c));
};

let oldBeforeUnmount = options.unmount;
options.unmount = vnode => {
	if (oldBeforeUnmount) oldBeforeUnmount(vnode);

	const c = vnode._component;
	if (c && c.__compositions) c.__compositions.u.forEach(f => f());
};

export function createComponent(comp) {
	comp.__compositions = true;
	return comp;
}

export function watch(src, cb) {
	const vr = ref(undefined, true);
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

export const $Reactive = Symbol("reactive");

export function reactive(value) {
	const c = currentComponent;
	return new Proxy(Object.create(null), {
		get(_, p) {
			if (p === $Reactive) return value;
			return Reflect.get(value, p);
		},
		set(_, p, newValue) {
			c.setState({});
			value =
				p === $Reactive
					? Object.assign({}, newValue)
					: Object.assign({}, value, { [p]: newValue });

			return true;
		},
		deleteProperty(target, p, value) {
			c.setState({});
			value = Object.assign({}, value);
			return Reflect.deleteProperty(target, p, value);
		}
		//todo implement all reactivity
	});
}

export function ref(v, staticRef) {
	const c = currentComponent;
	return {
		get value() {
			return v;
		},
		set value(newValue) {
			v = newValue;
			if (!staticRef) c.setState({});
		}
	};
}

export function unwrapRef(v) {
	return isRef(v) ? v.value : v;
}

export function isRef(v) {
	return (
		typeof v === "object" &&
		v &&
		Object.prototype.hasOwnProperty.call(v, "value")
	);
}

function handleEffect(up, c, init) {
	if (!up.src && up.args) return;
	let newArgs = [];

	if (
		!up.src ||
		argsChanged(up.args, (newArgs = resolveArgs(up.src, c, init)))
	) {
		const r = up.cb ? up.cb(newArgs, up.args || []) : newArgs[0];
		up.args = newArgs;
		if (up.vr) up.vr.value = r;
	}
}

function resolveArgs(src, c) {
	let a;
	if (src) {
		if (Array.isArray(src))
			return src.reduce((acc, s) => acc.concat(resolveArgs(s, c)), []);
		if (typeof src === "function") return [].concat(src(c.props));
		if (isRef(src)) return [src.value];
		if (src.Provider) return [resolveContext(src, c)];
		if ((a = src[$Reactive])) return [a];
	}

	throw "Cannot watch this " + src;
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
