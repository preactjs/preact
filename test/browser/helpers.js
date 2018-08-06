import { Component } from '../../src';

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
	let drainQueue;
	Component.__test__previousDebounce = Component.debounce;
	Component.debounce = cb => drainQueue = cb;
	return () => drainQueue && drainQueue();
}

/**
 * Teardown test environment and reset preact's internal state
 * @param {HTMLDivElement} scratch
 */
export function teardown(scratch) {
	scratch.parentNode.removeChild(scratch);

	if (typeof Component.__test__previousDebounce !== 'undefined') {
		Component.debounce = Component.__test__previousDebounce;
		delete Component.__test__previousDebounce;
	}
}
