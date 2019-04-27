
/** @type {Map<string, number>} */
export let stringTable;

export let allStrLengths = 0;

/**
 * Convert a string to an id. Works similar to a gzip dictionary.
 * @param {string | null} input
 * @return {number}
 */
export function getStringId(input) {
	if (input===null) return 0;
	if (stringTable==null) {
		stringTable = new Map();
	}

	if (!stringTable.has(input)) {
		stringTable.set(input, stringTable.size + 1);

		// String length + array which holds the length itself
		allStrLengths += input.length + 1;
	}

	return stringTable.get(input);
}
