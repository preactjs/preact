import { VNode } from 'preact';

/**
 * Return the component stack that was captured up to this point.
 */
export function captureOwnerStack(): string;

/**
 * Get the currently rendered `vnode`
 */
export function getCurrentVNode(): VNode | null;

/**
 * Get human readable name of the component/dom node
 */
export function getDisplayName(vnode: VNode): string;

/**
 * Return the component stack that was captured up to this point.
 */
export function getOwnerStack(vnode: VNode): string;

/**
 * Setup code to capture the component trace while rendering. Note that
 * we cannot simply traverse `vnode._parent` upwards, because we have some
 * debug messages for `this.setState` where the `vnode` is `undefined`.
 */
export function setupComponentStack(): void;

/**
 * Reset the history of which prop type warnings have been logged.
 */
export function resetPropWarnings(): void;
