// Subprocess entry point for frozen-intrinsics.test.js: bundled by esbuild
// and run with `node --frozen-intrinsics`. Not a `*.test.js`, so vitest does
// not auto-collect it. Prints `OK` on success, `FAIL: <msg>` + exit 2
// otherwise.
import { createElement, cloneElement, isValidElement } from '../../src/index';
import { cloneVNode } from '../../src/util';

const fail = msg => {
	console.error('FAIL: ' + msg);
	process.exit(2);
};
const assert = (cond, msg) => {
	if (!cond) fail(msg);
};

// Sanity: --frozen-intrinsics actually applied to this realm.
assert(Object.isFrozen(Object.prototype), 'Object.prototype is not frozen');

// Regression sentinel: Node tames the override mistake by replacing
// `Object.prototype.constructor` with an accessor pair. If a future Node
// makes it a plain non-writable data property instead, the bug fixed by
// `cloneVNode` reproduces under this flag and this should fail loudly.
const ctorDesc = Object.getOwnPropertyDescriptor(
	Object.prototype,
	'constructor'
);
assert(
	typeof ctorDesc.get === 'function' && typeof ctorDesc.set === 'function',
	'Object.prototype.constructor is no longer a tamed accessor — ' +
		'override-mistake bug may now reproduce under --frozen-intrinsics'
);

// createElement produces vnodes with the `constructor: undefined`
// JSON-injection guard — the property whose copy semantics drive the bug.
const vnode = createElement('div', { id: 'x' }, 'hi');
assert(vnode.type === 'div', 'createElement: wrong .type');
assert(
	Object.prototype.hasOwnProperty.call(vnode, 'constructor'),
	'createElement vnode missing own constructor guard'
);
assert(
	vnode.constructor === undefined,
	'createElement vnode constructor !== undefined'
);
assert(
	isValidElement(vnode),
	'isValidElement returned false on a createElement output'
);

// cloneVNode round-trips faithfully.
const copy = cloneVNode(vnode);
assert(copy !== vnode, 'cloneVNode returned same reference');
assert(
	Object.prototype.hasOwnProperty.call(copy, 'constructor'),
	'cloneVNode dropped constructor own-property guard'
);
assert(copy.constructor === undefined, 'cloneVNode constructor !== undefined');
assert(
	isValidElement(copy),
	'isValidElement returned false on a cloneVNode output'
);
for (const k of Object.keys(vnode)) {
	assert(copy[k] === vnode[k], 'cloneVNode dropped key: ' + k);
}

// cloneElement (the public clone API) also works under the flag.
const re = cloneElement(vnode, { id: 'y' });
assert(re.props.id === 'y', 'cloneElement did not override prop');
assert(isValidElement(re), 'cloneElement output failed isValidElement');

console.log('OK');
