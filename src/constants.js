// Internal._mode bitfield constants
/** Normal mount/patch. Not hydration or side-effecting top-level render. */
export const MODE_NONE = 0;
/** Normal hydration that attaches to a DOM tree but does not diff it. */
export const MODE_HYDRATE = 1;
/** Top level render unspecified behaviour (old replaceNode parameter to render) */
export const MODE_MUTATIVE_HYDRATE = 2;
/** Signifies this VNode suspended on the previous render */
export const MODE_SUSPENDED = 4;
/** Signifies this VNode errored on the previous render */
export const MODE_ERRORED = 8;
/** Reset all mode flags */
export const RESET_MODE = ~(
	MODE_HYDRATE |
	MODE_MUTATIVE_HYDRATE |
	MODE_SUSPENDED |
	MODE_ERRORED
);

/** Signifies that bailout checks will be bypassed */
export const FORCE_UPDATE = 16;
/** Signifies that a node needs to be updated */
export const DIRTY = 32;

export const EMPTY_ARR = [];

export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

// Internal._flags bitfield constants
export const TEXT_NODE = 1;
export const ELEMENT_NODE = 2;
export const CLASS_NODE = 4;
export const FUNCTION_NODE = 8;
export const FRAGMENT_NODE = 16;
/** Any type of component */
export const COMPONENT_NODE = CLASS_NODE | FUNCTION_NODE | FRAGMENT_NODE;
