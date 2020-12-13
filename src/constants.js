export const EMPTY_OBJ = {};
export const EMPTY_ARR = [];
export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;

export const FLAG_NONE = 0;
export const FLAG_MOUNT = 1;
export const FLAG_UNMOUNT = 1 << 1; // 2
export const FLAG_PLACEMENT = 1 << 2; // 4
export const FLAG_UPDATE = 1 << 3; // 8
