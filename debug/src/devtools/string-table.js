/**
 * The string table holds a mapping of strings to ids. This saves a lot of space
 * in messaging because we can only need to declare a string once and can later
 * refer to its id. This is especially true for component or element names which
 * expectedoccur multiple times.
 */

/**
 * Convert a string to an id. Works similar to a gzip dictionary.
 * @param {import('../internal').stringTable} table
 * @param {string | null} input
 * @return {number}
 */
export function getStringId(table, input) {
	if (input===null) return 0;

	if (!table.has(input)) {
		table.set(input, table.size + 1);
	}

	return table.get(input);
}

/**
 * Get the total length that's neeeded to encode all strings
 * @param {import('../internal').AdapterState["stringTable"]} table
 * @returns {number}
 */
export function getAllStrLengths(table) {
	return Array.from(table.keys())
		// One field for each character + field which holds the length
		.reduce((acc, item) => acc + item.length + 1, 0);
}
