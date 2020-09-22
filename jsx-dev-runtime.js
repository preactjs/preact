import { createElement } from 'preact';

/**
 * Create an virtual node (used for JSX). It's the successor of `createElement`.
 * @param {import('./src/internal').VNode["type"]} type The node name or Component
 * constructor for this virtual node
 * @param {object | null | undefined} [props] The properties of the virtual node
 * @param {string | undefined} [key] Optional key
 * @param {boolean} [_isStaticChildren] Marks if `jsx` or `jsxs` should be used.
 * For us they are the same thing as our debug warnings live in a separate
 * module (`preact/debug`). Only available via `jsxDEV`
 * @param {import('./src/internal').DevSource} [source] Optional source location
 * info from babel. Only available via `jsxDEV`
 * @param {import('./src/internal').DevSource} [self] Optional reference to the
 * component this node is part of. Only available via `jsxDEV`
 * @returns {import('./src/internal').VNode}
 */
export function jsx(type, props, key, _isStaticChildren, source, self) {
	if (key) props.key = key;

	if (source) {
		props.source = source;
		props.self = self;
	}

	return createElement(type, props);
}

// The difference between `jsxs` and `jsx` is that the former is used by babel
// when the node has more than one child
export const jsxs = jsx;

// Same as `jsx`, but with supplied `source` and `self` information
export const jsxDEV = jsx;

export { Fragment } from 'preact';
