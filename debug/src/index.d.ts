/**
 * Return the component stack that was captured up to this point.
 */
export function captureOwnerStack(): string;

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
