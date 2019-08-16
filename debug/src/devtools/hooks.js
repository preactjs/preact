import { options } from 'preact';
import { USE_STATE, USE_CALLBACK } from 'preact/hooks/constants';
import ErrorStackParser from 'error-stack-parser';
import { USE_REF, USE_MEMO, USE_REDUCER, USE_CONTEXT } from '../../../hooks/src/constants';

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

	/** @type {number[]} */
	let nativeHookTypes = [];

	let ignore = 0;
	let hookIdx = 0;
	options.hooked = type => {
		if (ignore > 0) return ignore--;
		// Ignore primitive hooks that call other primitive hooks
		if (type===USE_STATE || type===USE_CALLBACK || USE_REF) ignore++;
		if (type===USE_STATE || type===USE_REDUCER) editHooks.add(hookIdx);
		hookIdx++;
		nativeHookTypes.push(type);

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

		let hookType = nativeHookTypes[native];
		let currentHook = isNative
			? vnode._component.__hooks._list[native++]
			: null;


		// Must be `undefined` if not set, because `null` is a valid value
		let value;
		if (!isNative && debugValues.has(id)) {
			value = debugValues.get(id);
		}
		else if (isNative) {
			if (editable) {
				value = currentHook._value[0];
			}
			else if (hookType === USE_MEMO || hookType === USE_REF) {
				value = currentHook._value;
			}
			else if (hookType === USE_CONTEXT) {
				value = currentHook._value.Provider.props
					? currentHook._value.Provider.props.value
					: currentHook._value._defaultValue;
			}
			else {
				value = currentHook._value;
			}
		}

		/** @type {import('../internal').HookInspectData} */
		let data = {
			id: isNative ? native : null,
			value,
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
 */
export const setInHook = getVNode => (id, index, path, value) => {
	let vnode = getVNode(id);
	vnode._component.__hooks._list[index]._value[1](value);
};
