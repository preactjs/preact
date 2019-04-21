import { options } from 'preact';
import { USE_STATE, USE_CALLBACK } from 'preact/hooks/constants';
import ErrorStackParser from 'error-stack-parser';
import { getVNode } from './cache';

let usePrefix = /^use/;

/**
 * Collect detailed information about all hooks attached to a component
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').HookInspectData[]}
 */
export function inspectHooks(vnode) {
	let prevHooked = options.hooked;

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

		let stack = ErrorStackParser.parse(new Error());
		let cleaned = stack
			.slice(2, stack.findIndex(x => x.functionName==='inspectHooks') - 2)
			.reverse();

		// Insert marker for next stack
		if (traces.length > 0) traces.push(null);
		traces.push(...cleaned);
	};

	let c = vnode._component;
	c.render(c.props, c.state, c.context);
	options.hooked = prevHooked;

	// Group results by depth because a custom hook may call multiple other ones
	// under the hood
	/** @type {import('../internal').HookInspectData[]} */
	let result = [];

	let last = null;
	let native = 0;
	for (let i = 0; i < traces.length; i++) {
		let trace = traces[i];

		if (trace===null) {
			last = null;
			continue;
		}

		let isNative = i==traces.length || traces[i+1]==null;
		let editable = isNative && editHooks.has(native);

		/** @type {import('../internal').HookInspectData} */
		let data = {
			id: isNative ? native++ : null,
			// Must be `undefined` if not set. `null` is a valid value.
			value: editable ? vnode._component.__hooks._list[i]._value[0] : undefined,
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
