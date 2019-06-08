import { options } from 'preact';

/**
 * Setup a rerender function that will drain the queue of pending renders
 * @returns {() => void}
 */
export function setupRerender() {
	options.__test__previousDebounce = options.debounceRendering;
	options.debounceRendering = cb => options.__test__drainQueue = cb;
	return () => options.__test__drainQueue && options.__test__drainQueue();
}

/**
 * Run a test function, and flush all effects and rerenders after invoking it
 * @param {() => void} cb The function under test
 */
export function act(cb) {
	const previousRequestAnimationFrame = options.requestAnimationFrame;
	const rerender = setupRerender();

	/** @type {() => void} */
	let flush, toFlush;

	// Override requestAnimationFrame so we can flush pending hooks.
	options.requestAnimationFrame = (fc) => flush = fc;

	// Execute the callback we were passed.
	cb();
	rerender();

	while (flush) {
		toFlush = flush;
		flush = null;

		toFlush();
		rerender();
	}

	teardown();
	options.requestAnimationFrame = previousRequestAnimationFrame;
}

/**
 * Teardown test environment and reset preact's internal state
 */
export function teardown() {
	if (options.__test__drainQueue) {
		// Flush any pending updates leftover by test
		options.__test__drainQueue();
		delete options.__test__drainQueue;
	}

	if (typeof options.__test__previousDebounce !== 'undefined') {
		options.debounceRendering = options.__test__previousDebounce;
		delete options.__test__previousDebounce;
	}
	else {
		options.debounceRendering = undefined;
	}
}
