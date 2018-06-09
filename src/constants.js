// render modes

/** Do not re-render a component */
export const NO_RENDER = 0;
/** Synchronously re-render a component and its children */
export const SYNC_RENDER = 1;
/** Synchronously re-render a component, even if its lifecycle methods attempt to prevent it. */
export const FORCE_RENDER = 2;
/** Queue asynchronous re-render of a component and it's children */
export const ASYNC_RENDER = 3;


export const ATTR_KEY = '__preactattr_';

/** DOM properties that should NOT have "px" added when numeric */
export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

