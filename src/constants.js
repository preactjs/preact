// render modes

export const NO_RENDER = 0;
export const SYNC_RENDER = 1;
export const FORCE_RENDER = 2;
export const ASYNC_RENDER = 4;
export const ERROR_RENDER = SYNC_RENDER | 8; // Like sync render, but throws any errors that occur


export const ATTR_KEY = '__preactattr_';

// DOM properties that should NOT have "px" added when numeric
export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

