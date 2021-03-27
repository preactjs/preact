// Internal._flags bitfield constants
export const TYPE_TEXT = 1 << 0;
export const TYPE_ELEMENT = 1 << 1;
export const TYPE_CLASS = 1 << 2;
export const TYPE_FUNCTION = 1 << 3;
/** Signals this internal has a _parentDom prop that should change the parent
 * DOM node of it's children */
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
/** Signifies an error has been thrown and this component will be attempting to
 * handle & rerender the error on next render. In other words, on the next
 * render of this component, unset this mode and set the MODE_RERENDERING_ERROR.
 * This flag is distinct from MODE_RERENDERING_ERROR so that a component can
 * catch multiple errors thrown by its children in one render pass (see test
 * "should handle double child throws").
 */
export const MODE_PENDING_ERROR = 1 << 9;
/** Signifies this Internal is attempting to "handle" an error and is
 * rerendering. This mode tracks that a component's last rerender was trying to
 * handle an error. As such, if another error is thrown while a component has
 * this flag set, it should not handle the newly thrown error since it failed to
 * successfully rerender the original error. This prevents error handling
 * infinite render loops */
export const MODE_RERENDERING_ERROR = 1 << 10;
/** Signals this internal has been unmounted */
export const MODE_UNMOUNTING = 1 << 11;
/** This Internal is rendered in an SVG tree */
export const MODE_SVG = 1 << 12;

/** Signifies that bailout checks will be bypassed */
export const FORCE_UPDATE = 1 << 13;
/** Signifies that a node needs to be updated */
export const DIRTY_BIT = 1 << 14;

/** Reset all mode flags */
export const RESET_MODE = ~(
	MODE_HYDRATE |
	MODE_MUTATIVE_HYDRATE |
	MODE_SUSPENDED |
	MODE_ERRORED |
	MODE_RERENDERING_ERROR |
	FORCE_UPDATE
);

/** Modes a child internal inherits from their parent */
export const INHERITED_MODES = MODE_HYDRATE | MODE_MUTATIVE_HYDRATE | MODE_SVG;

export const EMPTY_ARR = [];

export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
