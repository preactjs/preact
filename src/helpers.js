import { TYPE_COMPONENT, TYPE_DOM, TYPE_ELEMENT, TYPE_ROOT } from './constants';

/**
 * @inline
 * @type {import('./internal').isComponentInternal} */
export const isComponentInternal = internal =>
	/** @type {*} */ (internal.flags & TYPE_COMPONENT);

/**
 * @inline
 * @type {import('./internal').isDomInternal} */
export const isDomInternal = internal =>
	/** @type {*} */ (internal.flags & TYPE_DOM);

/**
 * @inline
 * @type {import('./internal').isRootInternal} */
export const isRootInternal = internal =>
	/** @type {*} */ (internal.flags & TYPE_ROOT);

/**
 * @inline
 * TODO: Use type guard
 * @type {(internal: import('./internal').Internal) => number} */
export const isElementInternal = internal => internal.flags & TYPE_ELEMENT;
