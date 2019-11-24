import { getActualChildren } from './vnode';

/**
 *
 * @param {import('../../internal').VNode} vnode
 * @param {(vnode: import('../../internal').VNode) => void} fn
 */
export function traverse(vnode, fn) {
	fn(vnode);
	const children = getActualChildren(vnode);
	for (let i = 0; i < children.length; i++) {
		const child = /** @type {*} */ (children[i]);
		if (child != null) {
			fn(child);
		}
	}
}

/**
 *
 * @param {*} data
 * @param {(x: any) => import('./types').SerializedVNode | null} getVNode
 */
export function jsonify(data, getVNode) {
	const vnode = getVNode(data);
	if (vnode != null) return vnode;

	if (Array.isArray(data)) {
		return data.map(x => jsonify(x, getVNode));
	}
	switch (typeof data) {
		case 'string':
			return data.length > 300 ? data.slice(300) : data;
		case 'function': {
			return {
				type: 'function',
				name: data.displayName || data.name || 'anonymous'
			};
		}
		case 'object': {
			if (data === null) return null;
			const out = { ...data };
			Object.keys(out).forEach(key => {
				out[key] = jsonify(out[key], getVNode);
			});
			return out;
		}
		default:
			return data;
	}
}

export function cleanProps(props) {
	if (typeof props === 'string' || !props) return null;
	const out = { ...props };
	if (!Object.keys(out).length) return null;
	return out;
}

let reg = /__cC\d+/;

/**
 *
 * @param {Record<string, any>} context
 */
export function cleanContext(context) {
	let res = {};
	for (let key in context) {
		if (reg.test(key)) continue;
		res[key] = context[key];
	}

	if (Object.keys(res).length == 0) return null;
	return res;
}

/**
 * Deeply mutate a property by walking down an array of property keys
 * @param {Record<string, any>} obj
 * @param {Array<number | string>} path
 * @param {*} value
 */
export function setIn(obj, path, value) {
	let last = path.pop();
	let parent = path.reduce((acc, attr) => (acc ? acc[attr] : null), obj);
	if (parent && last) {
		parent[last] = value;
	}
}
