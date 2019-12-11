import { options, Fragment } from 'preact';
import { getDisplayName } from './devtools/custom';

let oldDiff = options._diff;
let oldDiffed = options.diffed;
let oldRoot = options._root;

let stack = [];

/**
 * Return the component stack that was captured up to this point.
 */
export function getComponentStack() {
	return stack.reduce((acc, vnode) => {
		acc += `  in ${getDisplayName(vnode)}`;

		const source = vnode.__source;
		if (source) {
			acc += ` (at ${source.fileName}:${source.lineNumber})`;
		}

		return (acc += '\n');
	}, '');
}

/**
 * Setup code to capture the component trace while rendering. Note that
 * we cannot simply traverse `vnode._parent` upwards, because we have some
 * debug messages for `this.setState` where the `vnode` is `undefined`.
 */
export function setupComponentStack() {
	options.diffed = vnode => {
		stack.pop();
		if (oldDiffed) oldDiffed(vnode);
	};

	options._diff = vnode => {
		if (typeof vnode.type === 'function') {
			if (vnode.type !== Fragment) {
				stack.push(vnode);
			}
		}
		if (oldDiff) oldDiff(vnode);
	};

	options._root = (vnode, parent) => {
		stack = [];
		if (oldRoot) oldRoot(vnode, parent);
	};
}
