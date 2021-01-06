/** Normal mount/patch. Not hydration or side-effecting top-level render. */
export const MODE_NONE = 0;
/** Normal hydration that attaches to a DOM tree but does not diff it. */
export const MODE_HYDRATE = 1;
/** Top level render unspecified behaviour (old replaceNode parameter to render) */
export const MODE_MUTATIVE_HYDRATE = 2;

export const EMPTY_ARR = [];

export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
