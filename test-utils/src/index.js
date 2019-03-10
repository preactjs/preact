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
	const previousDebounce = options.debounceRendering;
	const previousRequestAnimationFrame = options.requestAnimationFrame;
	const rerender = setupRerender();
	let flush;
	options.requestAnimationFrame = (fc) => flush = fc;
	cb();
	if (flush) {
		flush();
	}
	rerender();
	options.debounceRendering = previousDebounce;
	options.requestAnimationFrame = previousRequestAnimationFrame;
}
