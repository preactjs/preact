// Subprocess entry point for frozen-intrinsics.test.js.
//
// This file is bundled by esbuild and run with `node --frozen-intrinsics`.
// It is NOT a `*.test.js`, so vitest does not auto-collect it. The relative
// imports below resolve naturally for the IDE, oxlint, and esbuild — no
// alias needed — so any breakage here is caught by the normal lint flow.
//
// The script speaks via stdout: `OK` on success, `FAIL: <msg>` on stderr
// and exit 2 otherwise.
import { createElement, cloneElement, isValidElement } from '../../src/index';
import { cloneVNode } from '../../src/util';

const fail = msg => {
	console.error('FAIL: ' + msg);
	process.exit(2);
};
const assert = (cond, msg) => {
	if (!cond) fail(msg);
};

// 1. Sanity: --frozen-intrinsics actually applied to this realm. If false,
// the rest of the test is meaningless and we want to know loudly.
assert(Object.isFrozen(Object.prototype), 'Object.prototype is not frozen');
assert(
	!Object.isExtensible(Object.prototype),
	'Object.prototype is still extensible'
);

// 2. Regression sentinel: Node tames the override mistake by replacing
// `Object.prototype.constructor` with an accessor pair. If a future Node
// changes that to a plain non-writable data property, the bug fixed by
// `cloneVNode` will reproduce under this flag and we want this test to
// fail so the contract is revisited.
const ctorDesc = Object.getOwnPropertyDescriptor(
	Object.prototype,
	'constructor'
);
assert(ctorDesc, 'no descriptor for Object.prototype.constructor');
const isTamedAccessor =
	typeof ctorDesc.get === 'function' && typeof ctorDesc.set === 'function';
assert(
	isTamedAccessor,
	'Object.prototype.constructor is no longer a tamed accessor — ' +
		'override-mistake bug may now reproduce under --frozen-intrinsics; ' +
		'descriptor=' +
		JSON.stringify(Object.keys(ctorDesc))
);

// 3. Preact module init completed without throwing — the imports above
// would have failed otherwise. Confirm the entry points are wired up.
assert(typeof createElement === 'function', 'createElement is not a function');
assert(typeof cloneElement === 'function', 'cloneElement is not a function');
assert(
	typeof isValidElement === 'function',
	'isValidElement is not a function'
);
assert(typeof cloneVNode === 'function', 'cloneVNode is not a function');

// 4. createElement produces vnodes with the JSON-injection-guard
// constructor own-property. This is the property whose copy semantics
// drive the whole bug.
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

// 5. cloneVNode round-trips faithfully. (Under --frozen-intrinsics the
// bare `Object.assign({}, vnode)` would also succeed thanks to taming —
// but cloneVNode is the helper that has to keep working in stricter
// envs, so we exercise it here too as the supported codepath.)
const copy = cloneVNode(vnode);
assert(copy !== vnode, 'cloneVNode returned same reference');
assert(copy.type === 'div', 'cloneVNode dropped .type');
assert(copy.props === vnode.props, 'cloneVNode dropped .props identity');
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

// 6. cloneElement (the public clone API, which constructs a fresh vnode
// via createVNode) also works under the flag.
const re = cloneElement(vnode, { id: 'y' });
assert(re.props.id === 'y', 'cloneElement did not override prop');
assert(isValidElement(re), 'cloneElement output failed isValidElement');

console.log('OK');
