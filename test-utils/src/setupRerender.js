import { Component, options } from '../../src';

/**
 * Setup a rerender function that will drain the queue of pending renders
 * @returns {() => void}
 */
export function setupRerender() {
	Component.__test__previousDebounce = options.debounceRendering;
	options.debounceRendering = cb => Component.__test__drainQueue = cb;
	return () => Component.__test__drainQueue && Component.__test__drainQueue();
}
