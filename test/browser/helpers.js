/**
 * Setup the test environment
 * @returns {HTMLDivElement}
 */
export function setup() {
	const scratch = document.createElement('div');
	(document.body || document.documentElement).appendChild(scratch);
	return scratch;
}

/**
 * Teardown test environment and reset preact's internal state
 * @param {HTMLDivElement} scratch
 */
export function teardown(scratch) {
	scratch.parentNode.removeChild(scratch);
}

