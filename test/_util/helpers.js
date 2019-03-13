import { createElement as h, Component, options } from '../../src';
import { assign } from '../../src/util';
import { clearLog, getLog } from './logCall';

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

let oldOptions = null;
export function clearOptions() {
	oldOptions = assign({}, options);
	delete options.vnode;
	delete options.diff;
	delete options.diffed;
	delete options.commit;
	delete options.unmount;
}

/**
 * Teardown test environment and reset preact's internal state
 * @param {HTMLDivElement} scratch
 */
export function teardown(scratch) {
	scratch.parentNode.removeChild(scratch);

	if (oldOptions != null) {
		assign(options, oldOptions);
		oldOptions = null;
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

	if (getLog().length > 0) {
		clearLog();
	}
}

const Foo = () => 'd';
export const getMixedArray = () => (
	// Make it a function so each test gets a new copy of the array
	[0, 'a', 'b', <span>c</span>, <Foo />, null, undefined, false, ['e', 'f'], 1]
);
export const mixedArrayHTML = '0ab<span>c</span>def1';

/**
 * Reset obj to empty to keep reference
 * @param {object} obj
 */
export function clear(obj) {
	Object.keys(obj).forEach(key => delete obj[key]);
}
