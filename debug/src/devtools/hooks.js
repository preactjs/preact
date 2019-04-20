import { options } from 'preact';
import { useLayoutEffect, useDebugValue, useState, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'preact/hooks';
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

	let ignore = 0;
	options.hooked = fn => {
		if (ignore > 0) return ignore--;
		// Ignore primitive hooks that call other primitive hooks
		if (fn===useState || fn===useCallback) ignore++;

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

		let editable = trace.functionName===useState.name;

		/** @type {import('../internal').HookInspectData} */
		let data = {
			id: isHookPrimitive(trace.functionName) ? native++ : null,
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

/**
 * Check if a hook function is one of the native hooks
 * @param {string} name The hook function name
 */
export function isHookPrimitive(name) {
	switch (name) {
		case useState.name:
		case useRef.name:
		case useCallback.name:
		case useMemo.name:
		case useEffect.name:
		case useLayoutEffect.name:
		case useDebugValue.name:
		case useReducer.name:
		case useContext.name:
			return true;
		default: {
			return false;
		}
	}
}
