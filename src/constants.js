// Internal._flags bitfield constants
export const TYPE_TEXT = 1 << 0;
export const TYPE_ELEMENT = 1 << 1;
export const TYPE_CLASS = 1 << 2;
export const TYPE_FUNCTION = 1 << 3;
export const TYPE_ROOT = 1 << 4;

/** Any type of internal representing DOM */
export const TYPE_DOM = TYPE_TEXT | TYPE_ELEMENT;
/** Any type of component */
export const TYPE_COMPONENT = TYPE_CLASS | TYPE_FUNCTION | TYPE_ROOT;

// Modes of rendering
/** Normal hydration that attaches to a DOM tree but does not diff it. */
export const MODE_HYDRATE = 1 << 5;
/** Top level render unspecified behaviour (old replaceNode parameter to render) */
export const MODE_MUTATIVE_HYDRATE = 1 << 6;
/** Signifies this VNode suspended on the previous render */
export const MODE_SUSPENDED = 1 << 7;
/** Signifies this VNode errored on the previous render */
export const MODE_ERRORED = 1 << 8;
/** Signals this internal has been unmounted */
export const MODE_UNMOUNTED = 1 << 9;

/** Signifies that bailout checks will be bypassed */
export const FORCE_UPDATE = 1 << 10;
/** Signifies that a node needs to be updated */
export const DIRTY_BIT = 1 << 11;

/** Reset all mode flags */
export const RESET_MODE = ~(
	MODE_HYDRATE |
	MODE_MUTATIVE_HYDRATE |
	MODE_SUSPENDED |
	MODE_ERRORED |
	FORCE_UPDATE
);

/** Modes a child internal inherits from their parent */
export const INHERITED_MODES = MODE_HYDRATE | MODE_MUTATIVE_HYDRATE;

export const EMPTY_ARR = [];

export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
