/**
 * Array utility functions for Preact
 * Helper functions for common array operations
 */

/**
 * Check if all elements in an array satisfy a condition
 * @template T
 * @param {T[]} array The array to check
 * @param {(item: T, index: number) => boolean} predicate The condition function
 * @returns {boolean} True if all elements satisfy the condition
 */
export function every(array, predicate) {
	for (let i = 0; i < array.length; i++) {
		if (!predicate(array[i], i)) return false;
	}
	return true;
}

/**
 * Check if any element in an array satisfies a condition
 * @template T
 * @param {T[]} array The array to check
 * @param {(item: T, index: number) => boolean} predicate The condition function
 * @returns {boolean} True if any element satisfies the condition
 */
export function some(array, predicate) {
	for (let i = 0; i < array.length; i++) {
		if (predicate(array[i], i)) return true;
	}
	return false;
}

/**
 * Find the first element that satisfies a condition
 * @template T
 * @param {T[]} array The array to search
 * @param {(item: T, index: number) => boolean} predicate The condition function
 * @returns {T | undefined} The first matching element or undefined
 */
export function find(array, predicate) {
	for (let i = 0; i < array.length; i++) {
		if (predicate(array[i], i)) return array[i];
	}
	return undefined;
}

/**
 * Find the index of the first element that satisfies a condition
 * @template T
 * @param {T[]} array The array to search
 * @param {(item: T, index: number) => boolean} predicate The condition function
 * @returns {number} The index of the first matching element or -1
 */
export function findIndex(array, predicate) {
	for (let i = 0; i < array.length; i++) {
		if (predicate(array[i], i)) return i;
	}
	return -1;
}

/**
 * Remove duplicate elements from an array
 * @template T
 * @param {T[]} array The array to deduplicate
 * @returns {T[]} A new array without duplicates
 */
export function unique(array) {
	return Array.from(new Set(array));
}

/**
 * Flatten a nested array by one level
 * @template T
 * @param {T[][]} array The array to flatten
 * @returns {T[]} The flattened array
 */
export function flatten(array) {
	return array.reduce((acc, val) => acc.concat(val), []);
}

/**
 * Deeply flatten a nested array
 * @param {Array} array The array to flatten
 * @returns {Array} The deeply flattened array
 */
export function flattenDeep(array) {
	return array.reduce(
		(acc, val) =>
			Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val),
		[]
	);
}

/**
 * Partition an array into two arrays based on a condition
 * @template T
 * @param {T[]} array The array to partition
 * @param {(item: T) => boolean} predicate The condition function
 * @returns {[T[], T[]]} Two arrays: [matching, not matching]
 */
export function partition(array, predicate) {
	const matching = [];
	const notMatching = [];
	
	for (let i = 0; i < array.length; i++) {
		if (predicate(array[i])) {
			matching.push(array[i]);
		} else {
			notMatching.push(array[i]);
		}
	}
	
	return [matching, notMatching];
}

/**
 * Group array elements by a key function
 * @template T
 * @param {T[]} array The array to group
 * @param {(item: T) => string} keyFn Function that returns the group key
 * @returns {Object<string, T[]>} Object with grouped arrays
 */
export function groupBy(array, keyFn) {
	return array.reduce((groups, item) => {
		const key = keyFn(item);
		if (!groups[key]) {
			groups[key] = [];
		}
		groups[key].push(item);
		return groups;
	}, {});
}

/**
 * Create an array of numbers in a range
 * @param {number} start The start value
 * @param {number} end The end value (exclusive)
 * @param {number} [step=1] The step between values
 * @returns {number[]} Array of numbers in the range
 */
export function range(start, end, step = 1) {
	const result = [];
	for (let i = start; i < end; i += step) {
		result.push(i);
	}
	return result;
}

/**
 * Chunk an array into smaller arrays of a specified size
 * @template T
 * @param {T[]} array The array to chunk
 * @param {number} size The size of each chunk
 * @returns {T[][]} Array of chunks
 */
export function chunk(array, size) {
	const chunks = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

/**
 * Get the last element of an array
 * @template T
 * @param {T[]} array The array
 * @returns {T | undefined} The last element or undefined
 */
export function last(array) {
	return array[array.length - 1];
}

/**
 * Get the first element of an array
 * @template T
 * @param {T[]} array The array
 * @returns {T | undefined} The first element or undefined
 */
export function first(array) {
	return array[0];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @template T
 * @param {T[]} array The array to shuffle
 * @returns {T[]} A new shuffled array
 */
export function shuffle(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
