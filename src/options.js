/**
 * @typedef {import('./component').Component} Component
 * @typedef {import('./vnode').VNode} VNode
 */

/**
 * Global options
 * @public
 * @typedef Options
 * @property {boolean} [syncComponentUpdates] If `true`, `prop` changes trigger synchronous component updates. Defaults to true.
 * @property {(vnode: VNode) => void} [vnode] Processes all created VNodes.
 * @property {(component: Component) => void} [afterMount] Hook invoked after a component is mounted.
 * @property {(component: Component) => void} [afterUpdate] Hook invoked after the DOM is updated with a component's latest render.
 * @property {(component: Component) => void} [beforeUnmount] Hook invoked immediately before a component is unmounted.
 * @property {(rerender: function) => void} [debounceRendering] Hook invoked whenever a rerender is requested. Can be used to debounce rerenders.
 * @property {(event: Event) => Event | void} [event] Hook invoked before any Preact event listeners. The return value (if any) replaces the native browser event given to event listeners
 */

/** @type {Options}  */
const options = {};

export default options;
