import { options } from 'preact';
import { USE_STATE, USE_CALLBACK } from 'preact/hooks/constants';
import ErrorStackParser from 'error-stack-parser';
import { getVNode } from './cache';

let usePrefix = /^use/;

/**
 * Collect a stack trace of a hook.
 * @returns {import('error-stack-parser').StackFrame[]}
 */
export function getHookStack() {
	let stack = ErrorStackParser.parse(new Error());
	return stack
		.slice(3, stack.findIndex(x => x.functionName==='inspectHooks') - 1)
		.reverse();
}

/**
 * Collect detailed information about all hooks attached to a component
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').HookInspectData[]}
 */
export function inspectHooks(vnode) {
	let prevHooked = options.hooked;
	let prevDebugValue = options.useDebugValue;

	/** @type {import('error-stack-parser').StackFrame[]} */
	let traces = [];

	/** @type {Set<number>} */
	let editHooks = new Set();

	let ignore = 0;
	let hookIdx = 0;
	options.hooked = type => {
		if (ignore > 0) return ignore--;
		// Ignore primitive hooks that call other primitive hooks
		if (type===USE_STATE || type===USE_CALLBACK) ignore++;
		if (type===USE_STATE) editHooks.add(hookIdx);
		hookIdx++;

		let stack = getHookStack();

		// Insert marker for next stack
		if (traces.length > 0) traces.push(null);
		traces.push(...stack);
	};

	/** @type {Map<string, string>} */
	let debugValues = new Map();
	options.useDebugValue = value => {
		let trace = getHookStack()[0];
		let id = trace.fileName + trace.lineNumber + trace.columnNumber;
		debugValues.set(id, value);
	};

	let c = vnode._component;
	c.render(c.props, c.state, c.context);
	options.hooked = prevHooked;
	options.useDebugValue = prevDebugValue;

	// Group results by depth because a custom hook may call multiple other ones
	// under the hood. Given a simple component and a simple custom hook with a
	// debug value:
	//
	// ```js
	//   function useCounter() {
	//     useDebugValue('custom value');
	//     return useState(0);
	//   }
	//
	//   function Foo() {
	//     let [v] = useCounter();
	//     let [v2] = useState(42);
	//     return <h1>Counter: {v}, State: {v2}</h1>;
	//   }
	// ```
	//
	// we'll have an array of traces that is similar to this:
	//
	//   [Foo, useCounter, debugValue, useState, null, Foo, useState]
	//
	// Basically we use `null` as a marker to find native hooks. On top of that
	// we filter out the leftmost item. This is the first one at index 0 or the
	// first one after a `null` value.
	//
	// We don't filter it out earlier, because keeping it in there is beneficial
	// for matching the corresponding `debugValue`. Other hooks are already
	// presorted automatically by their call order, but `useDebugValue`-hooks
	// don't have the same guarantees. They can be invoked at any time inside a
	// user defined hook.
	//
	// So we use a neat little trick and match the `debugValue` based by their
	// parent. This will either be the component itself or another custom hook.

	/** @type {import('../internal').HookInspectData[]} */
	let result = [];

	let last = null;
	let prevTrace = traces[0];
	let native = 0;
	for (let i = 1; i < traces.length; i++) {
		let trace = traces[i];

		if (trace===null) {
			last = null;
			prevTrace = null;
			i++; // Skip the component call
			continue;
		}

		let isNative = i==traces.length || traces[i+1]==null;
		let editable = isNative && editHooks.has(native);

		let id = prevTrace
			? prevTrace.fileName + prevTrace.lineNumber + prevTrace.columnNumber
			: '';

		/** @type {import('../internal').HookInspectData} */
		let data = {
			id: isNative ? native++ : null,
			// Must be `undefined` if not set. `null` is a valid value.
			value: editable
				? vnode._component.__hooks._list[native]._value[0]
				: !isNative && debugValues.has(id)
					? debugValues.get(id)
					: undefined,
			isStateEditable: editable,
			name: trace.functionName.replace(usePrefix, ''),
			subHooks: []
		};

		if (last!=null) {
			last.subHooks.push(data);
		}
		else {
			result.push(data);
		}
		prevTrace = trace;
		last = data;
	}

	return result;
}

/**
 * Update `useState` hook value
 * @param {number} id
 * @param {number} index
 * @param {Array<string | number>} path
 * @param {*} value
 */
export function setInHook(id, index, path, value) {
	let vnode = getVNode(id);
	vnode._component.__hooks._list[index]._value[1](value);
}
