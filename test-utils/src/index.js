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
