/**
 * Performance utility functions for Preact
 * These utilities help with performance monitoring and optimization
 */

/**
 * Measure the execution time of a function
 * Useful for performance debugging in development
 * @param {string} label A descriptive label for the measurement
 * @param {Function} fn The function to measure
 * @returns {*} The return value of the function
 * @example
 * const result = measurePerformance('render', () => render(<App />));
 */
export function measurePerformance(label, fn) {
	if (typeof performance === 'undefined') {
		return fn();
	}

	const start = performance.now();
	const result = fn();
	const end = performance.now();
	
	if (process.env.NODE_ENV !== 'production') {
		console.log(`[Perf] ${label}: ${(end - start).toFixed(2)}ms`);
	}
	
	return result;
}

/**
 * Create a memoized version of a function
 * Caches results based on the first argument
 * @template T
 * @param {Function} fn The function to memoize
 * @returns {Function} The memoized function
 * @example
 * const expensiveCalc = memoize((n) => n * n);
 */
export function memoize(fn) {
	const cache = new Map();
	
	return function memoized(arg) {
		if (cache.has(arg)) {
			return cache.get(arg);
		}
		
		const result = fn.call(this, arg);
		cache.set(arg, result);
		return result;
	};
}

/**
 * Throttle a function to execute at most once per specified time
 * Useful for performance-intensive event handlers
 * @param {Function} fn The function to throttle
 * @param {number} wait Time in milliseconds to wait between executions
 * @returns {Function} The throttled function
 * @example
 * const throttledScroll = throttle(handleScroll, 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(fn, wait) {
	let lastCall = 0;
	let timeout;
	
	return function throttled(...args) {
		const now = Date.now();
		const remaining = wait - (now - lastCall);
		
		if (remaining <= 0) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			lastCall = now;
			return fn.apply(this, args);
		} else if (!timeout) {
			timeout = setTimeout(() => {
				lastCall = Date.now();
				timeout = null;
				fn.apply(this, args);
			}, remaining);
		}
	};
}

/**
 * Debounce a function to delay execution until after wait time has elapsed
 * since the last call
 * @param {Function} fn The function to debounce
 * @param {number} wait Time in milliseconds to wait
 * @returns {Function} The debounced function
 * @example
 * const debouncedSearch = debounce(performSearch, 300);
 * input.addEventListener('input', debouncedSearch);
 */
export function debounce(fn, wait) {
	let timeout;
	
	return function debounced(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => fn.apply(this, args), wait);
	};
}

/**
 * Create a performance mark for Chrome DevTools
 * Only works in development mode
 * @param {string} markName The name of the performance mark
 */
export function mark(markName) {
	if (
		process.env.NODE_ENV !== 'production' &&
		typeof performance !== 'undefined' &&
		performance.mark
	) {
		performance.mark(markName);
	}
}

/**
 * Measure performance between two marks
 * @param {string} measureName The name of the measurement
 * @param {string} startMark The start mark name
 * @param {string} endMark The end mark name
 */
export function measure(measureName, startMark, endMark) {
	if (
		process.env.NODE_ENV !== 'production' &&
		typeof performance !== 'undefined' &&
		performance.measure
	) {
		try {
			performance.measure(measureName, startMark, endMark);
		} catch (e) {
			// Marks might not exist, fail silently
		}
	}
}
