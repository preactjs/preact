// render modes

/** Do not recursively re-render a component */
export const NO_RENDER = 0;
/** Recursively re-render a component and it's children */
export const SYNC_RENDER = 1;
/** Force a re-render of a component */
export const FORCE_RENDER = 2;
/** Asynchronously queue re-renders of a component and it's children */
export const ASYNC_RENDER = 3;


export const ATTR_KEY = '__preactattr_';

/** DOM properties that should NOT have "px" added when numeric */
export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

