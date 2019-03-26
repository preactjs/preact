import { Component, options } from 'preact';

/**
 * Setup a rerender function that will drain the queue of pending renders
 * @returns {() => void}
 */
export function setupRerender() {
	Component.__test__previousDebounce = options.debounceRendering;
	options.debounceRendering = cb => Component.__test__drainQueue = cb;
	return () => Component.__test__drainQueue && Component.__test__drainQueue();
}

export function act(cb) {
	const previousRequestAnimationFrame = options.requestAnimationFrame;
	const rerender = setupRerender();
	let flush;
	// Override requestAnimationFrame so we can flush pending hooks.
	options.requestAnimationFrame = (fc) => flush = fc;
	// Execute the callback we were passed.
	cb();
	// State COULD be built up flush it.
	if (flush) {
		flush();
	}
	rerender();
	// If rerendering with new state has triggered effects
	// flush them aswell since options.raf will have repopulated this.
	if (flush) {
		flush();
	}
	options.debounceRendering = Component.__test__previousDebounce;
	options.requestAnimationFrame = previousRequestAnimationFrame;
}

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
 * Teardown test environment and reset preact's internal state
 * @param {HTMLDivElement} scratch
 */
export function teardown(scratch) {
	if (scratch) {
		scratch.parentNode.removeChild(scratch);
	}

	if (Component.__test__drainQueue) {
		// Flush any pending updates leftover by test
		Component.__test__drainQueue();
		delete Component.__test__drainQueue;
	}

	if (typeof Component.__test__previousDebounce !== 'undefined') {
		options.debounceRendering = Component.__test__previousDebounce;
		delete Component.__test__previousDebounce;
	}
}
