import { options } from 'preact';

/**
 * Setup a rerender function that will drain the queue of pending renders
 * @returns {() => void}
 */
export function setupRerender() {
	let prev = options.debounceRendering;
	options.debounceRendering = cb => prev = cb;
	return () => prev && prev();
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
