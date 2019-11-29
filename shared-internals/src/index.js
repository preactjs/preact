/**
 * Get the direct parent of a `VNode`.
 * @param {import('../../src/internal').VNode} vnode
 * @returns {import('../../src/internal').VNode | null}
 */
export function getParent(vnode) {
	return vnode._parent;
}

/**
 * Return the `Component` instance associated with a rendered `VNode`.
 * @param {import('../../src/internal').VNode} vnode
 * @returns {import('../../src/internal').Component | null}
 */
export function getComponent(vnode) {
	return vnode._component;
}

/**
 * Return the rendered DOM node associated with a rendered `VNode`.
 *
 * "Associated" here means either the DOM node directly output as a result of
 * rendering the vnode (for DOM vnodes) or the first DOM node output by a
 * child vnode for component vnodes.
 *
 * @param {import('../../src/internal').VNode} vnode
 * @returns {import('../../src/internal').PreactElement | Text | null}
 */
export function getDom(vnode) {
	return vnode._dom;
}

/**
 * Get the last dom child of a `vnode`. This will only be set for
 * Fragment-like components.
 * @param {import('../../src/internal').VNode} vnode
 * @returns {import('../../src/internal').PreactElement | Text | null}
 */
export function getLastDomChild(vnode) {
	return vnode._lastDomChild;
}

/**
 * Return the child `VNodes` associated with a rendered `VNode`.
 * @param {import('../../src/internal').VNode} vnode
 * @returns {Array<import('../../src/internal').VNode | null | undefined>}
 */
export function getChildren(vnode) {
	return vnode._children;
}

/**
 * Return the `VNode` of a `component` when it was last rendered.
 * @param {import('../../src/internal').Component} component
 * @returns {import('../../src/internal').VNode}
 */
export function getComponentVNode(component) {
	return component._vnode;
}

// Options getters/setters

/**
 * Return private `options._diff` hook that's called before `diff()`.
 * @param {import('../../src/internal').Options} options
 * @returns {import('../../src/internal').Options["_diff"]}
 */
export function getOptionsDiff(options) {
	return options._diff;
}

/**
 * Return private `options._diff` hook that's called at the end of
 * each commit.
 * @param {import('../../src/internal').Options} options
 * @returns {import('../../src/internal').Options["_commit"]}
 */
export function getOptionsCommit(options) {
	return options._commit;
}

/**
 * Set private `options._diff` hook that's called before `diff()`.
 * @param {import('../../src/internal').Options} options
 * @param {import('../../src/internal').Options["_diff"]} fn
 */
export function setOptionsDiff(options, fn) {
	options._diff = fn;
}

/**
 * Return private `options._diff` hook that's called at the end of
 * each commit.
 * @param {import('../../src/internal').Options} options
 * @param {import('../../src/internal').Options["_commit"]} fn
 */
export function setOptionsCommit(options, fn) {
	options._commit = fn;
}
