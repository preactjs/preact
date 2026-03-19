// Vnode._flags
/** Normal hydration that attaches to a DOM tree but does not diff it. */
export const MODE_HYDRATE = 1 << 5;
/** Signifies this VNode suspended on the previous render */
export const MODE_SUSPENDED = 1 << 7;
/** Indicates that this node needs to be inserted while patching children */
export const INSERT_VNODE = 1 << 2;
/** Indicates a VNode has been matched with another VNode in the diff */
export const MATCHED = 1 << 1;
/** Indicates that this vnode has been unmounted before indicating the loss of event listeners */
export const FORCE_PROPS_REVALIDATE = 1 << 0;

// component._bits
/** Component is processing an exception */
export const COMPONENT_PROCESSING_EXCEPTION = 1 << 0;
/** Component has a pending error */
export const COMPONENT_PENDING_ERROR = 1 << 1;
/** Component should force update (skip shouldComponentUpdate) */
export const COMPONENT_FORCE = 1 << 2;
/** Component is queued for update */
export const COMPONENT_DIRTY = 1 << 3;

/** Reset all mode flags */
export const RESET_MODE = ~(MODE_HYDRATE | MODE_SUSPENDED);

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
export const MATH_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

export const NULL = null;
export const UNDEFINED = undefined;
export const EMPTY_OBJ = /** @type {any} */ ({});
export const EMPTY_ARR = [];

export const MATHML_TOKEN_ELEMENTS = /(mi|mn|mo|ms$|mte|msp)/;
