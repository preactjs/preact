/** Indicates that this node needs to be inserted while patching children */
export const INSERT_VNODE = 1 << 16;
export const MATCHED = 1 << 17;

/** Reset all mode flags */
export const RESET_MODE = ~(INSERT_VNODE | MATCHED);

export const EMPTY_OBJ = {};
export const EMPTY_VNODE = /** @type {import('./internal').VNode} */ (
	EMPTY_OBJ
);
export const EMPTY_ARR = [];
export const IS_NON_DIMENSIONAL =
	/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
