import { options } from 'preact';
import { useState, useReducer, useCallback } from 'preact/hooks';
import ErrorStackParser from 'error-stack-parser';

/**
 * Collect detailed information about all hooks attached to a component
 * @param {import('../internal').VNode} vnode
 * @returns {import('../internal').HookInspectData[]}
 */
export function inspectHooks(vnode) {
	let prevHooked = options.hooked;
	let result = [];

	let ignore = 0;
	options.hooked = fn => {
		if (ignore > 0) return ignore--;
		// Ignore primitive hooks that call other primitive hooks
		if (fn===useState || fn===useCallback) ignore++;

		let stack = ErrorStackParser.parse(new Error());
		let cleaned = stack.slice(2, stack.findIndex(x => x.functionName===fn.name) + 1);
		result.push(cleaned);
	};

	let c = vnode._component;
	c.render(c.props, c.state, c.context);
	options.hooked = prevHooked;

	// Group results by depth because a custom hook may call multiple other ones
	// under the hood
	// TODO

	return result;
}

export function getHookName(fn) {
	switch (fn) {
		case useState: return 'useState';
		case useReducer: return 'useReducer';
	}
}
