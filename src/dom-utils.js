/**
 * DOM utility functions for Preact
 * Helper functions for working with the DOM efficiently
 */

import { NULL } from './constants';

/**
 * Batch multiple DOM reads to avoid layout thrashing
 * @param {Function[]} readCallbacks Array of functions that read from the DOM
 * @returns {Array} Results from all read operations
 * @example
 * const [width, height] = batchDOMReads([
 *   () => element.offsetWidth,
 *   () => element.offsetHeight
 * ]);
 */
export function batchDOMReads(readCallbacks) {
	return readCallbacks.map(cb => cb());
}

/**
 * Batch multiple DOM writes to avoid layout thrashing
 * Executes all write operations in a single animation frame
 * @param {Function[]} writeCallbacks Array of functions that write to the DOM
 * @example
 * batchDOMWrites([
 *   () => element.style.width = '100px',
 *   () => element.style.height = '100px'
 * ]);
 */
export function batchDOMWrites(writeCallbacks) {
	if (typeof requestAnimationFrame !== 'undefined') {
		requestAnimationFrame(() => {
			writeCallbacks.forEach(cb => cb());
		});
	} else {
		writeCallbacks.forEach(cb => cb());
	}
}

/**
 * Get all sibling elements of a given element
 * @param {Element} element The reference element
 * @param {boolean} [includeSelf=false] Whether to include the element itself
 * @returns {Array} Array of sibling elements
 */
export function getSiblings(element, includeSelf = false) {
	const siblings = [];
	let sibling = element.parentNode?.firstChild;
	
	while (sibling) {
		if (sibling.nodeType === 1 && (includeSelf || sibling !== element)) {
			siblings.push(/** @type {Element} */ (sibling));
		}
		sibling = sibling.nextSibling;
	}
	
	return siblings;
}

/**
 * Get all parent elements up to the root or a specific ancestor
 * @param {Element} element The starting element
 * @param {Element} [until] Stop at this ancestor (not included in result)
 * @returns {Array} Array of parent elements
 */
export function getParents(element, until = NULL) {
	const parents = [];
	let parent = element.parentNode;
	
	while (parent && parent.nodeType === 1 && parent !== until) {
		parents.push(/** @type {Element} */ (parent));
		parent = parent.parentNode;
	}
	
	return parents;
}

/**
 * Check if an element matches a selector
 * Cross-browser compatible version
 * @param {Element} element The element to check
 * @param {string} selector The CSS selector
 * @returns {boolean} True if element matches selector
 */
export function matches(element, selector) {
	const proto = /** @type {any} */ (Element.prototype);
	const fn =
		proto.matches ||
		proto.matchesSelector ||
		proto.webkitMatchesSelector ||
		proto.msMatchesSelector;
	
	return fn.call(element, selector);
}

/**
 * Find the closest ancestor that matches a selector
 * @param {Element} element The starting element
 * @param {string} selector The CSS selector to match
 * @returns {Element | null} The matching ancestor or null
 */
export function closest(element, selector) {
	// Use native closest if available
	if (element.closest) {
		return element.closest(selector);
	}
	
	// Polyfill for older browsers
	let current = element;
	while (current && current.nodeType === 1) {
		if (matches(current, selector)) {
			return current;
		}
		current = /** @type {Element} */ (current.parentNode);
	}
	
	return NULL;
}

/**
 * Get computed style value for an element
 * @param {Element} element The element
 * @param {string} property The CSS property name
 * @returns {string} The computed style value
 */
export function getStyle(element, property) {
	if (typeof window === 'undefined') return '';
	
	const computed = window.getComputedStyle(element);
	return computed.getPropertyValue(property) || computed[property];
}

/**
 * Check if an element is visible in the viewport
 * @param {Element} element The element to check
 * @param {boolean} [partially=false] True to check if partially visible
 * @returns {boolean} True if element is visible
 */
export function isInViewport(element, partially = false) {
	if (typeof window === 'undefined') return false;
	
	const rect = element.getBoundingClientRect();
	const windowHeight = window.innerHeight || document.documentElement.clientHeight;
	const windowWidth = window.innerWidth || document.documentElement.clientWidth;
	
	if (partially) {
		return (
			rect.top < windowHeight &&
			rect.bottom > 0 &&
			rect.left < windowWidth &&
			rect.right > 0
		);
	}
	
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= windowHeight &&
		rect.right <= windowWidth
	);
}

/**
 * Smoothly scroll an element into view
 * @param {Element} element The element to scroll to
 * @param {ScrollIntoViewOptions} [options] Scroll options
 */
export function scrollIntoView(element, options = {}) {
	/** @type {ScrollIntoViewOptions} */
	const defaultOptions = {
		behavior: 'smooth',
		block: 'start',
		inline: 'nearest'
	};
	
	if (element.scrollIntoView) {
		element.scrollIntoView({ ...defaultOptions, ...options });
	}
}

/**
 * Get element offset relative to document
 * @param {Element} element The element
 * @returns {{top: number, left: number}} The offset coordinates
 */
export function getOffset(element) {
	const rect = element.getBoundingClientRect();
	const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	
	return {
		top: rect.top + scrollTop,
		left: rect.left + scrollLeft
	};
}

/**
 * Create a DOM element with attributes and children
 * Useful for non-JSX element creation
 * @param {string} tag The tag name
 * @param {object} [attrs={}] Element attributes
 * @param {Array} [children=[]] Child elements or text
 * @returns {Element} The created element
 * @example
 * const div = createDOMElement('div', { class: 'container' }, ['Hello']);
 */
export function createDOMElement(tag, attrs = {}, children = []) {
	const element = document.createElement(tag);
	
	// Set attributes
	for (const key in attrs) {
		if (key === 'className') {
			element.className = attrs[key];
		} else if (key === 'style' && typeof attrs[key] === 'object') {
			Object.assign(element.style, attrs[key]);
		} else {
			element.setAttribute(key, attrs[key]);
		}
	}
	
	// Add children
	children.forEach(child => {
		if (typeof child === 'string') {
			element.appendChild(document.createTextNode(child));
		} else if (child instanceof Element) {
			element.appendChild(child);
		}
	});
	
	return element;
}
