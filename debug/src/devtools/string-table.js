import { encode } from './util';

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
 * Convert string table to something the extension understands
 * @param {import('../internal').AdapterState["stringTable"]} table
 * @returns {number[]}
 */
export function flushTable(table) {
	let ops = [0];

	table.forEach((_, k) => {
		ops[0] += k.length + 1;
		ops.push(k.length, ...encode(k));
	});

	return ops;
}
