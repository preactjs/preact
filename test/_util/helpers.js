import { createElement as h, Component } from '../../src';

/** @jsx h */

/**
 * Setup the test environment
 * @returns {HTMLDivElement}
 */
export function setupScratch() {
	const scratch = document.createElement('div');
	scratch.id = 'scratch';
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
	if (typeof obj === 'string') return obj;
	return Object.prototype.toString.call(obj).replace(/(^\[object |\]$)/g, '');
}

let log = {};

/**
 * Modify obj's original method to log calls and arguments on logger object
 * @template T
 * @param {T} obj
 * @param {keyof T} method
 */
export function logCall(obj, method) {
	let old = obj[method];
	obj[method] = function() {
		let c = '';
		for (let i=0; i<arguments.length; i++) {
			if (c) c += ', ';
			c += serialize(arguments[i]);
		}
		const key = `${serialize(this)}.${method}(${c})`;
		log[key] = (log[key] || 0) + 1;
		return old.apply(this, arguments);
	};
}

/**
 * Return log object
 * @return {object} log
 */
export function getLog() {
	return log;
}

/** Clear log object */
export function clearLog() {
	log = {};
}

/**
 * Reset obj to empty to keep reference
 * @param {object} obj
 */
export function clear(obj) {
	Object.keys(obj).forEach(key => delete obj[key]);
}
