import { options } from 'preact';
import { useState, useReducer, useCallback } from 'preact/hooks';
import ErrorStackParser from 'error-stack-parser';
import { getVNode } from './cache';

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
		let cleaned = stack.slice(2, stack.findIndex(x => x.functionName===fn.name) + 1);
		traces.push(cleaned.reverse());
	};

	let c = vnode._component;
	c.render(c.props, c.state, c.context);
	options.hooked = prevHooked;

	// Group results by depth because a custom hook may call multiple other ones
	// under the hood
	// TODO: Walk recursively
	/** @type {import('../internal').HookInspectData[]} */
	let result = [];
	for (let i = 0; i < traces.length; i++) {
		let trace = traces[i];
		let editable = trace[0].functionName===useState.name;

		result.push({
			id: i,
			value: editable ? vnode._component.__hooks._list[i]._value[0] : null,
			isStateEditable: editable,
			name: trace[0].functionName,
			subHooks: []
		});
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

export function getHookName(fn) {
	switch (fn) {
		case useState: return 'useState';
		case useReducer: return 'useReducer';
	}
}
