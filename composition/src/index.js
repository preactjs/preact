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
	const vr = {
		[$Reactive]: true,
		value: undefined
	};
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

const $Reactive = Symbol('reactive');

export function reactive(value) {
	const c = currentComponent;
	return new Proxy(value, {
		get(target, p) {
			return p === $Reactive || p === '$value'
				? value // returns the immutable value
				: Reflect.get(target, p);
		},
		set(target, p, newValue) {
			let r =
				p === '$value'
					? !!Object.assign(target, newValue) // override the innervalue
					: Reflect.set(target, p, newValue); // set the newValue on target

			// update value with the immutable value of target
			value = Object.assign({}, target);

			// Make the component re-render
			c.setState({});
			return r;
		},
		deleteProperty(target, p) {
			// delete the property on target
			const r = Reflect.deleteProperty(target, p);
			// update value with the immutable value of target
			value = Object.assign({}, target);
			// Make the component re-render
			c.setState({});
			return r;
		}
		//todo implement all reactivity
	});
}

export function ref(v) {
	const c = currentComponent;
	return {
		get value() {
			return v;
		},
		set value(newValue) {
			v = newValue;
			c.setState({});
		},
		[$Reactive]: true
	};
}

export function unwrapRef(v) {
	return isRef(v) ? v.value : v;
}

export function isRef(v) {
	return v && v[$Reactive] === true;
}

function handleEffect(up, c, init) {
	if (!up.src) {
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
		const r = up.cb ? up.cb(newArgs, up.args) : newArgs;
		up.args = newArgs;
		if (up.vr) up.vr.value = r;
	}
}

function resolveArgs(src, c) {
	let a;
	if (src) {
		// use the value from a getter function
		if (typeof src === 'function') return src(c.props);
		// unrap the value and subscribe to the context
		if (src.Provider) return resolveContext(src, c);
		// unwrap ref or reactive, returning their immutable value
		if ((a = src[$Reactive])) return a === true ? src.value : a;
		// is src a createRef holding a element, return the current
		if (isPlainObject(src)) return src.current;
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
