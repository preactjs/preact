import { createElement as h, Component } from '../../src';

/** @jsx h */

/**
 * Setup the test environment
 * @returns {HTMLDivElement}
 */
export function setupScratch() {
	const scratch = document.createElement('div');
	(document.body || document.documentElement).appendChild(scratch);
	return scratch;
}

/**
 * Setup a rerender function that will drain the queue of pending renders
 * @returns {() => void}
 */
export function setupRerender() {
	Component.__test__previousDebounce = Component.debounce;
	Component.debounce = cb => Component.__test__drainQueue = cb;

	return () => Component.__test__drainQueue && Component.__test__drainQueue();
}

/**
 * Teardown test environment and reset preact's internal state
 * @param {HTMLDivElement} scratch
 */
export function teardown(scratch) {
	scratch.parentNode.removeChild(scratch);

	if (Component.__test__drainQueue) {
		// Flush any pending updates leftover by test
		Component.__test__drainQueue();
		delete Component.__test__drainQueue;
	}

	if (typeof Component.__test__previousDebounce !== 'undefined') {
		Component.debounce = Component.__test__previousDebounce;
		delete Component.__test__previousDebounce;
	}
}

const Foo = () => 'd';
export const getMixedArray = () => (
	// Make it a function so each test gets a new copy of the array
	[0, 'a', 'b', <span>c</span>, <Foo />, null, undefined, false, ['e', 'f'], 1]
);
export const mixedArrayHTML = '0ab<span>c</span>def1';

/**
 * Serialize an object
 * @param {Object} obj
 * @return {string}
 */
export function serialize(obj) {
	if (obj instanceof Text) return '#text';
	if (obj instanceof Element) return `<${obj.localName}>${obj.textContent}`;
	if (obj === document) return 'document';
	return Object.prototype.toString.call(obj).replace(/(^\[object |\]$)/g, '');
}
